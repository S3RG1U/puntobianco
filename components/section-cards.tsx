import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type SectionCard = {
  title: string;
  value: string;
  change: string;
  isUp: boolean;
  summary: string;
  note: string;
};

export function SectionCards({ cards }: { cards: SectionCard[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
      {cards.map(({ title, value, change, isUp, summary, note }) => {
        const TrendIcon = isUp ? TrendingUpIcon : TrendingDownIcon;

        return (
          <Card key={title} className="@container/card flex h-full flex-col">
            <CardHeader>
              <CardDescription>{title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendIcon />
                  {change}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="mt-auto flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {summary} <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">{note}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
