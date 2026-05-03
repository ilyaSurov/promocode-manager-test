import dayjs from 'dayjs';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type DatePreset = 'today' | '7d' | '30d' | 'custom';

export type DateRangeValue = {
  dateFrom: string;
  dateTo: string;
  preset: DatePreset;
};

function rangeToday(): DateRangeValue {
  return {
    preset: 'today',
    dateFrom: dayjs().startOf('day').toISOString(),
    dateTo: dayjs().startOf('day').add(1, 'day').toISOString(),
  };
}

function rangeLastDays(days: number): DateRangeValue {
  return {
    preset: days === 7 ? '7d' : '30d',
    dateFrom: dayjs().subtract(days, 'day').startOf('day').toISOString(),
    dateTo: dayjs().add(1, 'day').startOf('day').toISOString(),
  };
}

type DateRangeContextValue = DateRangeValue & {
  setCustomRange: (from: Date | null, to: Date | null) => void;
  applyPreset: (p: Exclude<DatePreset, 'custom'>) => void;
};

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DateRangeValue>(() => rangeLastDays(7));

  const applyPreset = useCallback((p: Exclude<DatePreset, 'custom'>) => {
    if (p === 'today') {
      setState(rangeToday());
    } else if (p === '7d') {
      setState(rangeLastDays(7));
    } else {
      setState(rangeLastDays(30));
    }
  }, []);

  const setCustomRange = useCallback((from: Date | null, to: Date | null) => {
    if (!from || !to) {
      return;
    }
    const dateFrom = dayjs(from).startOf('day').toISOString();
    const dateTo = dayjs(to).add(1, 'day').startOf('day').toISOString();
    setState({
      preset: 'custom',
      dateFrom,
      dateTo,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setCustomRange,
      applyPreset,
    }),
    [state, setCustomRange, applyPreset],
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) {
    throw new Error('useDateRange outside DateRangeProvider');
  }
  return ctx;
}
