import "server-only";

import type { DataTableTab } from "@/components/data-table";
import type { SectionCard } from "@/components/section-cards";
import { can, type Resource, type RoleName } from "@/lib/auth/permissions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Placeholder figures until these modules are connected. Transfers already use
// real data, see lib/dashboard/transfers.ts. Filtering happens
// here on the server, so a role never receives data it isn't allowed to read.
const sections: { resource: Resource; card: SectionCard; tab: DataTableTab }[] =
  [
    {
      resource: "patient",
      card: {
        title: "Active patients",
        value: "48",
        change: "+12%",
        isUp: true,
        summary: "More than last month",
        note: "Patients currently in care",
      },
      tab: {
        value: "patients",
        label: "Patients",
        columns: [
          { key: "name", header: "Name" },
          { key: "country", header: "Country" },
          { key: "status", header: "Status", isStatus: true },
          { key: "coordinator", header: "Coordinator" },
        ],
        rows: [
          {
            name: "Andrea Conti",
            country: "Italy",
            status: "In treatment",
            coordinator: "Elena Pop",
          },
          {
            name: "Marco Ferri",
            country: "Italy",
            status: "Arriving",
            coordinator: "Elena Pop",
          },
          {
            name: "Hanna Berg",
            country: "Germany",
            status: "In treatment",
            coordinator: "Mihai Dan",
          },
          {
            name: "Louis Martin",
            country: "France",
            status: "Follow-up",
            coordinator: "Mihai Dan",
          },
          {
            name: "Giulia Rossi",
            country: "Italy",
            status: "Arriving",
            coordinator: "Elena Pop",
          },
          {
            name: "Peter Vogel",
            country: "Austria",
            status: "Follow-up",
            coordinator: "Ana Toma",
          },
        ],
      },
    },
    {
      resource: "treatment",
      card: {
        title: "Treatments in progress",
        value: "31",
        change: "+5%",
        isUp: true,
        summary: "Steady this month",
        note: "Across all active patients",
      },
      tab: {
        value: "treatments",
        label: "Treatments",
        columns: [
          { key: "patient", header: "Patient" },
          { key: "procedure", header: "Procedure" },
          { key: "stage", header: "Stage", isStatus: true },
          { key: "nextVisit", header: "Next visit" },
        ],
        rows: [
          {
            patient: "Andrea Conti",
            procedure: "Dental implants",
            stage: "Healing",
            nextVisit: "12 Nov 2026",
          },
          {
            patient: "Hanna Berg",
            procedure: "Veneers",
            stage: "Fitting",
            nextVisit: "6 Nov 2026",
          },
          {
            patient: "Louis Martin",
            procedure: "Root canal",
            stage: "Completed",
            nextVisit: "20 Dec 2026",
          },
          {
            patient: "Peter Vogel",
            procedure: "Crowns",
            stage: "Completed",
            nextVisit: "15 Jan 2027",
          },
          {
            patient: "Marco Ferri",
            procedure: "Dental implants",
            stage: "Planned",
            nextVisit: "9 Nov 2026",
          },
        ],
      },
    },
    {
      resource: "accommodation",
      card: {
        title: "Rooms occupied",
        value: "22",
        change: "-8%",
        isUp: false,
        summary: "Fewer than last week",
        note: "Out of 30 partner rooms",
      },
      tab: {
        value: "accommodation",
        label: "Accommodation",
        columns: [
          { key: "guest", header: "Guest" },
          { key: "property", header: "Property" },
          { key: "checkIn", header: "Check-in" },
          { key: "checkOut", header: "Check-out" },
          { key: "status", header: "Status", isStatus: true },
        ],
        rows: [
          {
            guest: "Andrea Conti",
            property: "Hotel Central",
            checkIn: "28 Oct 2026",
            checkOut: "13 Nov 2026",
            status: "Checked in",
          },
          {
            guest: "Hanna Berg",
            property: "Apartament Parc",
            checkIn: "1 Nov 2026",
            checkOut: "8 Nov 2026",
            status: "Checked in",
          },
          {
            guest: "Marco Ferri",
            property: "Hotel Central",
            checkIn: "8 Nov 2026",
            checkOut: "16 Nov 2026",
            status: "Reserved",
          },
          {
            guest: "Giulia Rossi",
            property: "Apartament Parc",
            checkIn: "10 Nov 2026",
            checkOut: "14 Nov 2026",
            status: "Reserved",
          },
        ],
      },
    },
  ];

function localize(value: string, t: Dictionary) {
  const text = t.dashboard.sampleText;
  return text[value] ?? value.replace(/\b[A-Z][a-z]{2}\b/, (m) => text[m] ?? m);
}

export function getDashboardData(userRoles: RoleName[], t: Dictionary) {
  const visible = sections.filter(({ resource }) =>
    can(userRoles, resource, "read"),
  );

  return {
    cards: visible.map(({ card }) => ({
      ...card,
      title: localize(card.title, t),
      summary: localize(card.summary, t),
      note: localize(card.note, t),
    })),
    tabs: visible.map(({ tab }) => ({
      ...tab,
      label: localize(tab.label, t),
      columns: tab.columns.map((column) => ({
        ...column,
        header: localize(column.header, t),
      })),
      rows: tab.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            localize(value, t),
          ]),
        ),
      ),
    })),
    showArrivals: can(userRoles, "patient", "read"),
    hasSampleData: visible.length > 0,
  };
}
