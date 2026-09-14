/**
 * The owner portal's own navigation.
 *
 * The prototype gives an owner nine screens. Defining the set once here
 * keeps every page carrying the same tabs, and means adding a screen is one
 * edit rather than nine.
 */
export const OWNER_NAV = [
  { href: "/owner", label: "Overview" },
  { href: "/owner/properties", label: "Properties" },
  { href: "/owner/ownership", label: "Ownership" },
  { href: "/owner/vacancy", label: "Empty units" },
  { href: "/owner/offers", label: "Offers" },
  { href: "/owner/finance", label: "Money" },
  { href: "/owner/statements", label: "Statements" },
  { href: "/owner/maintenance", label: "Repairs" },
  { href: "/owner/mandate", label: "Our agreement" },
  { href: "/owner/documents", label: "Documents" },
];
