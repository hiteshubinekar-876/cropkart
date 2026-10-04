import Link from "next/link";

const footerGroups = [
  {
    title: "Marketplace",
    links: [
      { href: "/products", label: "All products" },
      { href: "/sell-on-greencart", label: "Sell on CropKart" },
      { href: "/farmer/dashboard", label: "Seller dashboard" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/chat", label: "Chat Assistant" },
      { href: "/bulk-order-enquiry", label: "Bulk Order Enquiry" },
      { href: "/contact-us", label: "Contact Us" },
      { href: "/orders", label: "Orders" },
    ],
  },
  {
    title: "Built for",
    links: [
      { href: "/account", label: "Customers" },
      { href: "/bulk-order-enquiry", label: "Retailers" },
      { href: "/bulk-order-enquiry", label: "Wholesalers" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-brand-100 bg-[#f8fff8]">
      <div className="shell grid gap-12 py-14 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <p className="font-serif text-3xl font-bold">Simple farm commerce for everyday buying and agri supply.</p>
          <p className="max-w-md text-sm leading-6 text-ink-600">
            CropKart helps farmers sell produce and agri inputs directly while buyers, retailers,
            and bulk teams source from one cleaner marketplace.
          </p>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title} className="space-y-4">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-ink-400">
              {group.title}
            </p>
            <div className="space-y-3">
              {group.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-ink-600 hover:text-brand-600"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
