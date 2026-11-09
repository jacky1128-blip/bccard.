// 없는 주소: 뒤로 가기 + 첫 화면으로
import Link from 'next/link';
import { BrandHeader, Page, btn, t } from '@/components/ui';

export default function NotFound() {
  return (
    <Page>
      <BrandHeader back="/" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className={t.pageTitle}>페이지를 찾을 수 없어요</h1>
        <span className={t.desc}>주소가 바뀌었거나 없는 페이지예요</span>
      </div>
      <Link href="/" className={btn.primary}>첫 화면으로</Link>
    </Page>
  );
}
