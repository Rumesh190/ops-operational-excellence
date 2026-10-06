import { RedTagCreateQrPrintPage } from "@/features/five-s/red-tag/red-tag-module";

export default async function Page({ searchParams }: { searchParams: Promise<{ plant?: string; quantity?: string }> }) {
  const { plant, quantity: requestedQuantity } = await searchParams;
  const parsedQuantity = Number(requestedQuantity);
  const quantity = Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= 100 ? parsedQuantity : 1;
  return <RedTagCreateQrPrintPage plantRef={plant} quantity={quantity} />;
}
