// 구조화 데이터(schema.org JSON-LD) · 구글·네이버 검색과 ChatGPT·Perplexity 같은 AI 검색이 페이지 내용을 정확히 읽게 함
// </script> 끊김(XSS) 방지로 < 를 유니코드로 바꿔서 넣음
export default function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
