export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-black tracking-[-.02em] text-stone-900 sm:text-[30px]">{title}</h1><p className="mt-1.5 text-sm text-stone-500">{description}</p></div>{action ? <div className="shrink-0 self-start">{action}</div> : null}</header>;
}
