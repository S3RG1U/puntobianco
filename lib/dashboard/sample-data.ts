import "server-only";

import type { DataTableTab } from "@/components/data-table";
import type { SectionCard } from "@/components/section-cards";
import { can, type Resource, type RoleName } from "@/lib/auth/permissions";

// Placeholder figures until these modules have real tables. Filtering happens
// here on the server, so a role never receives data it isn't allowed to read.
const sections: { resource: Resource; card: SectionCard; tab: DataTableTab }[] = [
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
        { name: "Andrea Conti", country: "Italy", status: "In treatment", coordinator: "Elena Pop" },
        { name: "Marco Ferri", country: "Italy", status: "Arriving", coordinator: "Elena Pop" },
        { name: "Hanna Berg", country: "Germany", status: "In treatment", coordinator: "Mihai Dan" },
        { name: "Louis Martin", country: "France", status: "Follow-up", coordinator: "Mihai Dan" },
        { name: "Giulia Rossi", country: "Italy", status: "Arriving", coordinator: "Elena Pop" },
        { name: "Peter Vogel", country: "Austria", status: "Follow-up", coordinator: "Ana Toma" },
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
        { patient: "Andrea Conti", procedure: "Dental implants", stage: "Healing", nextVisit: "12 Nov 2026" },
        { patient: "Hanna Berg", procedure: "Veneers", stage: "Fitting", nextVisit: "6 Nov 2026" },
        { patient: "Louis Martin", procedure: "Root canal", stage: "Completed", nextVisit: "20 Dec 2026" },
        { patient: "Peter Vogel", procedure: "Crowns", stage: "Completed", nextVisit: "15 Jan 2027" },
        { patient: "Marco Ferri", procedure: "Dental implants", stage: "Planned", nextVisit: "9 Nov 2026" },
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
        { guest: "Andrea Conti", property: "Hotel Central", checkIn: "28 Oct 2026", checkOut: "13 Nov 2026", status: "Checked in" },
        { guest: "Hanna Berg", property: "Apartament Parc", checkIn: "1 Nov 2026", checkOut: "8 Nov 2026", status: "Checked in" },
        { guest: "Marco Ferri", property: "Hotel Central", checkIn: "8 Nov 2026", checkOut: "16 Nov 2026", status: "Reserved" },
        { guest: "Giulia Rossi", property: "Apartament Parc", checkIn: "10 Nov 2026", checkOut: "14 Nov 2026", status: "Reserved" },
      ],
    },
  },
  {
    resource: "transfer",
    card: {
      title: "Transfers this week",
      value: "9",
      change: "+2",
      isUp: true,
      summary: "Two more than last week",
      note: "Airport and clinic trips",
    },
    tab: {
      value: "transfers",
      label: "Transfers",
      columns: [
        { key: "passenger", header: "Passenger" },
        { key: "route", header: "Route" },
        { key: "pickup", header: "Pickup" },
        { key: "status", header: "Status", isStatus: true },
      ],
      rows: [
        { passenger: "Marco Ferri", route: "Airport to Hotel Central", pickup: "8 Nov 2026, 14:30", status: "Scheduled" },
        { passenger: "Hanna Berg", route: "Apartament Parc to clinic", pickup: "6 Nov 2026, 09:00", status: "Scheduled" },
        { passenger: "Giulia Rossi", route: "Airport to Apartament Parc", pickup: "10 Nov 2026, 11:15", status: "Scheduled" },
        { passenger: "Andrea Conti", route: "Hotel Central to clinic", pickup: "2 Nov 2026, 08:30", status: "Completed" },
      ],
    },
  },
  {
    resource: "payment",
    card: {
      title: "Outstanding payments",
      value: "€18,450",
      change: "-6%",
      isUp: false,
      summary: "Down from last month",
      note: "Invoices not yet paid",
    },
    tab: {
      value: "payments",
      label: "Payments",
      columns: [
        { key: "patient", header: "Patient" },
        { key: "invoice", header: "Invoice" },
        { key: "amount", header: "Amount" },
        { key: "due", header: "Due" },
        { key: "status", header: "Status", isStatus: true },
      ],
      rows: [
        { patient: "Andrea Conti", invoice: "PB-1042", amount: "€6,200", due: "15 Nov 2026", status: "Unpaid" },
        { patient: "Hanna Berg", invoice: "PB-1043", amount: "€4,850", due: "10 Nov 2026", status: "Partially paid" },
        { patient: "Louis Martin", invoice: "PB-1039", amount: "€1,300", due: "20 Oct 2026", status: "Paid" },
        { patient: "Marco Ferri", invoice: "PB-1044", amount: "€7,400", due: "30 Nov 2026", status: "Unpaid" },
      ],
    },
  },
];

export function getDashboardData(userRoles: RoleName[]) {
  const visible = sections.filter(({ resource }) =>
    can(userRoles, resource, "read"),
  );

  return {
    cards: visible.map(({ card }) => card),
    tabs: visible.map(({ tab }) => tab),
    showArrivals: can(userRoles, "patient", "read"),
  };
}
