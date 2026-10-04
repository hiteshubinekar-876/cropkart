export default function Loading() {
  return (
    <div className="shell py-16">
      <div className="animate-pulse space-y-6">
        <div className="h-14 w-48 rounded-full bg-slate-200" />
        <div className="h-10 w-3/4 rounded-3xl bg-slate-200" />
        <div className="h-96 rounded-[32px] bg-slate-100" />
      </div>
    </div>
  );
}
