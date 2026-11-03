export function bookingWebSearch(
  checkin: string,
  checkout: string,
  adults: number,
) {
  return `https://www.booking.com/searchresults.html?${new URLSearchParams({ ss: "Chișinău, Moldova", checkin, checkout, group_adults: String(adults), no_rooms: "1", group_children: "0", nflt: "ht_id=201" })}`;
}
