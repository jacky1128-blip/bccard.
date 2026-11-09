'use client';
// 날짜·시간 입력칸: 칸 아무 데나 누르면 바로 선택창이 열림 (오른쪽 아이콘만 눌러야 하는 기본 동작 대신)
import { btn } from './ui';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { type: 'date' | 'time' };

export default function PickerInput({ className = '', onClick, ...props }: Props) {
  return (
    <input
      {...props}
      className={`${btn.field} cursor-pointer tabular-nums ${className}`}
      onClick={(e) => {
        onClick?.(e);
        try {
          e.currentTarget.showPicker();
        } catch {
          // showPicker 를 지원하지 않는 브라우저는 기본 동작 그대로
        }
      }}
    />
  );
}
