"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

const chartData = [
  { date: "2026-04-01", arrivals: 6, departures: 4 },
  { date: "2026-04-02", arrivals: 2, departures: 5 },
  { date: "2026-04-03", arrivals: 4, departures: 3 },
  { date: "2026-04-04", arrivals: 6, departures: 7 },
  { date: "2026-04-05", arrivals: 9, departures: 7 },
  { date: "2026-04-06", arrivals: 8, departures: 9 },
  { date: "2026-04-07", arrivals: 6, departures: 5 },
  { date: "2026-04-08", arrivals: 10, departures: 8 },
  { date: "2026-04-09", arrivals: 1, departures: 3 },
  { date: "2026-04-10", arrivals: 7, departures: 5 },
  { date: "2026-04-11", arrivals: 8, departures: 9 },
  { date: "2026-04-12", arrivals: 7, departures: 5 },
  { date: "2026-04-13", arrivals: 9, departures: 10 },
  { date: "2026-04-14", arrivals: 3, departures: 6 },
  { date: "2026-04-15", arrivals: 3, departures: 4 },
  { date: "2026-04-16", arrivals: 3, departures: 5 },
  { date: "2026-04-17", arrivals: 11, departures: 9 },
  { date: "2026-04-18", arrivals: 9, departures: 10 },
  { date: "2026-04-19", arrivals: 6, departures: 5 },
  { date: "2026-04-20", arrivals: 2, departures: 4 },
  { date: "2026-04-21", arrivals: 3, departures: 5 },
  { date: "2026-04-22", arrivals: 6, departures: 4 },
  { date: "2026-04-23", arrivals: 3, departures: 6 },
  { date: "2026-04-24", arrivals: 10, departures: 7 },
  { date: "2026-04-25", arrivals: 5, departures: 6 },
  { date: "2026-04-26", arrivals: 2, departures: 3 },
  { date: "2026-04-27", arrivals: 10, departures: 11 },
  { date: "2026-04-28", arrivals: 3, departures: 5 },
  { date: "2026-04-29", arrivals: 8, departures: 6 },
  { date: "2026-04-30", arrivals: 11, departures: 10 },
  { date: "2026-05-01", arrivals: 4, departures: 6 },
  { date: "2026-05-02", arrivals: 7, departures: 8 },
  { date: "2026-05-03", arrivals: 6, departures: 5 },
  { date: "2026-05-04", arrivals: 10, departures: 11 },
  { date: "2026-05-05", arrivals: 12, departures: 10 },
  { date: "2026-05-06", arrivals: 12, departures: 13 },
  { date: "2026-05-07", arrivals: 10, departures: 8 },
  { date: "2026-05-08", arrivals: 4, departures: 5 },
  { date: "2026-05-09", arrivals: 6, departures: 5 },
  { date: "2026-05-10", arrivals: 7, departures: 8 },
  { date: "2026-05-11", arrivals: 8, departures: 7 },
  { date: "2026-05-12", arrivals: 5, departures: 6 },
  { date: "2026-05-13", arrivals: 5, departures: 4 },
  { date: "2026-05-14", arrivals: 11, departures: 12 },
  { date: "2026-05-15", arrivals: 12, departures: 10 },
  { date: "2026-05-16", arrivals: 8, departures: 10 },
  { date: "2026-05-17", arrivals: 12, departures: 11 },
  { date: "2026-05-18", arrivals: 8, departures: 9 },
  { date: "2026-05-19", arrivals: 6, departures: 5 },
  { date: "2026-05-20", arrivals: 4, departures: 6 },
  { date: "2026-05-21", arrivals: 2, departures: 4 },
  { date: "2026-05-22", arrivals: 2, departures: 3 },
  { date: "2026-05-23", arrivals: 6, departures: 7 },
  { date: "2026-05-24", arrivals: 7, departures: 6 },
  { date: "2026-05-25", arrivals: 5, departures: 6 },
  { date: "2026-05-26", arrivals: 5, departures: 4 },
  { date: "2026-05-27", arrivals: 11, departures: 12 },
  { date: "2026-05-28", arrivals: 6, departures: 5 },
  { date: "2026-05-29", arrivals: 2, departures: 3 },
  { date: "2026-05-30", arrivals: 9, departures: 7 },
  { date: "2026-05-31", arrivals: 4, departures: 6 },
  { date: "2026-06-01", arrivals: 4, departures: 5 },
  { date: "2026-06-02", arrivals: 12, departures: 10 },
  { date: "2026-06-03", arrivals: 3, departures: 4 },
  { date: "2026-06-04", arrivals: 11, departures: 10 },
  { date: "2026-06-05", arrivals: 2, departures: 4 },
  { date: "2026-06-06", arrivals: 7, departures: 6 },
  { date: "2026-06-07", arrivals: 8, departures: 9 },
  { date: "2026-06-08", arrivals: 10, departures: 8 },
  { date: "2026-06-09", arrivals: 11, departures: 12 },
  { date: "2026-06-10", arrivals: 4, departures: 5 },
  { date: "2026-06-11", arrivals: 2, departures: 4 },
  { date: "2026-06-12", arrivals: 12, departures: 11 },
  { date: "2026-06-13", arrivals: 2, departures: 3 },
  { date: "2026-06-14", arrivals: 11, departures: 10 },
  { date: "2026-06-15", arrivals: 8, departures: 9 },
  { date: "2026-06-16", arrivals: 9, departures: 8 },
  { date: "2026-06-17", arrivals: 12, departures: 13 },
  { date: "2026-06-18", arrivals: 3, departures: 4 },
  { date: "2026-06-19", arrivals: 9, departures: 7 },
  { date: "2026-06-20", arrivals: 10, departures: 11 },
  { date: "2026-06-21", arrivals: 4, departures: 5 },
  { date: "2026-06-22", arrivals: 8, departures: 7 },
  { date: "2026-06-23", arrivals: 12, departures: 13 },
  { date: "2026-06-24", arrivals: 3, departures: 5 },
  { date: "2026-06-25", arrivals: 4, departures: 5 },
  { date: "2026-06-26", arrivals: 11, departures: 10 },
  { date: "2026-06-27", arrivals: 11, departures: 12 },
  { date: "2026-06-28", arrivals: 4, departures: 5 },
  { date: "2026-06-29", arrivals: 3, departures: 4 },
  { date: "2026-06-30", arrivals: 11, departures: 10 },
]

const timeRanges = [
  { value: "90d", label: "Last 3 months" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
]

const chartConfig = {
  arrivals: {
    label: "Arrivals",
    color: "var(--chart-2)",
  },
  departures: {
    label: "Departures",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [selectedRange, setTimeRange] = React.useState<string | null>(null)
  const timeRange = selectedRange ?? (isMobile ? "7d" : "90d")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - (daysToSubtract - 1))
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Patient arrivals</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Arrivals and departures for the selected period
          </span>
          <span className="@[540px]/card:hidden">Selected period</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            items={timeRanges}
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillArrivals" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-arrivals)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-arrivals)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillDepartures" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-departures)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-departures)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="departures"
              type="natural"
              fill="url(#fillDepartures)"
              stroke="var(--color-departures)"
              stackId="a"
            />
            <Area
              dataKey="arrivals"
              type="natural"
              fill="url(#fillArrivals)"
              stroke="var(--color-arrivals)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
