import { useState } from 'react';
import { useT, formatCalendarTitle } from '../../i18n';
import dayjs from 'dayjs';

interface Props {
  value: string;
  minDate?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export default function CalendarPicker({ value, minDate, onSelect, onClose }: Props) {
  const { tArray, lang } = useT();
  const weekdays = tArray('calendar.weekdays');

  const [current, setCurrent] = useState(dayjs(value));
  const year = current.year();
  const month = current.month(); // 0-indexed

  const firstDay = dayjs(`${year}-${month + 1}-01`);
  const daysInMonth = firstDay.daysInMonth();
  const startWeekday = firstDay.day();

  const days: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const d = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    return d.isBefore(dayjs(minDate), 'day');
  };

  const isSelected = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return d === value;
  };

  const isToday = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return d === dayjs().format('YYYY-MM-DD');
  };

  const handlePrev = () => setCurrent(current.subtract(1, 'month'));
  const handleNext = () => setCurrent(current.add(1, 'month'));

  const handleClick = (day: number) => {
    if (isDisabled(day)) return;
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(d);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[4px] z-[1000] flex items-end justify-center font-['Plus_Jakarta_Sans']" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-2 px-5 pb-6 w-full max-w-[500px] animate-[slideUp_0.25s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Handle bar */}
        <div className="flex justify-center py-2 pb-3">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer text-gray-900 transition-all active:bg-sky-50 active:border-sky-200 active:text-sky-500" onClick={handlePrev}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="text-base font-bold text-gray-900">{formatCalendarTitle(year, month, lang)}</span>
          <button className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer text-gray-900 transition-all active:bg-sky-50 active:border-sky-200 active:text-sky-500" onClick={handleNext}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center mb-2">
          {weekdays.map((w) => (
            <div key={w} className="text-xs font-semibold text-gray-400 py-1.5">{w}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 text-center">
          {days.map((day, idx) => {
            const empty = day === null;
            const disabled = day && isDisabled(day);
            const selected = day && isSelected(day);
            const today = day && isToday(day);

            let classes = "py-2.5 text-sm font-medium cursor-pointer rounded-xl transition-all relative text-gray-900";
            if (empty) classes += " cursor-default";
            else if (disabled) classes += " text-gray-400 opacity-50 cursor-not-allowed";
            else if (selected) classes += " bg-sky-500 text-white font-bold shadow-[0_2px_8px_rgba(14,165,233,0.3)]";
            else if (today) classes += " text-sky-500 font-bold";
            else classes += " active:bg-gray-50";

            return (
              <div
                key={idx}
                className={classes}
                onClick={() => day && handleClick(day)}
              >
                {day}
                {today && !selected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
