"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { intlLocales } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
type Notice = {
  id: string;
  title: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
};
type Feed = { events: Notice[]; unread: number; revision: string };
const Context = createContext<{
  feed: Feed;
  online: boolean;
  reload: () => void;
}>({
  feed: { events: [], unread: 0, revision: "" },
  online: true,
  reload: () => {},
});
export function TeamUpdates({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<Feed>({
    events: [],
    unread: 0,
    revision: "",
  });
  const [online, setOnline] = useState(true);
  const router = useRouter();
  const { t } = useI18n();
  const previous = useRef<Feed | null>(null);
  const busy = useRef(false);
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("Unavailable");
      const next: Feed = await response.json();
      if (previous.current && next.revision !== previous.current.revision) {
        const seen = new Set(previous.current.events.map((event) => event.id));
        for (const event of next.events
          .filter((event) => !event.read && !seen.has(event.id))
          .slice(0, 3)) {
          toast(event.title, {
            description: event.message,
            action: { label: t.notifications.open, onClick: () => router.push(event.href) },
          });
          if (
            "Notification" in window &&
            Notification.permission === "granted" &&
            localStorage.getItem("clinic-browser-alerts") === "on"
          ) {
            const alert = new Notification(event.title, {
              body: event.message,
              tag: event.id,
            });
            alert.onclick = () => {
              window.focus();
              router.push(event.href);
              alert.close();
            };
          }
        }
        router.refresh();
        window.dispatchEvent(new Event("clinic:updated"));
      }
      previous.current = next;
      setFeed(next);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      busy.current = false;
    }
  }, [router, t]);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (
        !document.hidden ||
        ("Notification" in window && Notification.permission === "granted")
      )
        void load();
    }, 10000);
    window.addEventListener("focus", load);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);
  return (
    <Context.Provider value={{ feed, online, reload: load }}>
      {children}
    </Context.Provider>
  );
}
export function NotificationBell() {
  const { feed, online, reload } = useContext(Context);
  const { locale, t } = useI18n();
  const [permission, setPermission] = useState<string>("default");
  useEffect(() => {
    let disposed = false;
    let permissionStatus: PermissionStatus | undefined;
    const update = () => {
      if (!disposed && "Notification" in window)
        setPermission(Notification.permission);
    };
    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((status) => {
        if (disposed) return;
        permissionStatus = status;
        status.addEventListener("change", update);
        update();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      permissionStatus?.removeEventListener("change", update);
    };
  }, []);
  async function enable() {
    if (!("Notification" in window)) {
      toast.error(t.notifications.unsupported);
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem("clinic-browser-alerts", "on");
      toast.success(t.notifications.enabled);
    }
  }
  async function mark(id?: string) {
    const result = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    if (result.ok) reload();
    else toast.error(t.notifications.markFailed);
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.notifications.bell(feed.unread)}
            className="relative"
          />
        }
      >
        <BellIcon />
        {feed.unread > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-xs text-primary-foreground">
            {Math.min(feed.unread, 99)}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t.notifications.title}</h2>
          <Badge variant="outline">
            {online ? t.notifications.live : t.notifications.reconnecting}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={enable}
            disabled={permission === "denied"}
          >
            {permission === "granted"
              ? t.notifications.alertsEnabled
              : t.notifications.enableAlerts}
          </Button>
          {feed.unread > 0 && (
            <Button size="sm" variant="ghost" onClick={() => mark()}>
              {t.notifications.markAll}
            </Button>
          )}
        </div>
        {permission === "denied" && (
          <p className="text-xs text-muted-foreground">
            {t.notifications.blocked}
          </p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {!feed.events.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.notifications.empty}
            </p>
          )}
          {feed.events.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              onClick={() => void mark(event.id)}
              className="flex flex-col gap-1 rounded-md border-b p-3 hover:bg-muted"
            >
              <span className="text-sm font-medium">
                {!event.read && (
                  <span
                    aria-label={t.notifications.unread}
                    className="mr-2 inline-block size-2 rounded-full bg-primary"
                  />
                )}
                {event.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {event.message}
              </span>
              <time
                className="text-xs text-muted-foreground"
                dateTime={event.createdAt}
              >
                {new Date(event.createdAt).toLocaleString(intlLocales[locale], {
                  timeZone: "Europe/Chisinau",
                })}
              </time>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
