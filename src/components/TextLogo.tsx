export function TextLogo({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <span className={`font-bold tracking-tight ${sizeClasses[size]}`}>
      <span className="text-[#FF6B00]">Talk</span>
      <span className="text-[#222222] dark:text-white"> Reminder</span>
    </span>
  )
}
