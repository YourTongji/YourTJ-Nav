export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-12 border-t border-hairline sm:mt-16">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-1 px-5 pb-10 pt-8 text-center sm:px-8">
        <p className="text-[12px] text-ink">© {year} YourTJ 社区</p>
        <p className="text-[11.5px] text-ink-muted">Made by students, for students.</p>
      </div>
    </footer>
  )
}
