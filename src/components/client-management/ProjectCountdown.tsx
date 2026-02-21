import { useState, useEffect } from 'react';
import { Hourglass } from 'lucide-react';

interface ProjectCountdownProps {
  endDate: string;
}

export function ProjectCountdown({ endDate }: ProjectCountdownProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  const timeStr = `${isOverdue ? '-' : ''}${days}j ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}min ${String(seconds).padStart(2, '0')}s`;

  const colorClass = isOverdue || days < 10 ? 'text-destructive' : days < 20 ? 'text-orange-500' : 'text-green-500';

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-bold ${colorClass}`}>
      <Hourglass className="h-4.5 w-4.5" />
      {timeStr}
    </span>
  );
}
