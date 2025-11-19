export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove padding for messages page to allow full-height layout
  return <div className="h-full -m-6">{children}</div>;
}
