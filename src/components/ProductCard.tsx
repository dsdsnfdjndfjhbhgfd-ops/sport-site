import Link from "next/link";
import { formatPrice } from "@/lib/money";

interface Props {
  product: {
    slug: string;
    name: string;
    price: number;
    oldPrice: number | null;
    imageUrl: string;
    category?: { name: string };
  };
}

export function ProductCard({ product }: Props) {
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;
  return (
    <Link href={`/product/${product.slug}`} className="card">
      <div className="card-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {discount > 0 && <span className="tag-sale">-{discount}%</span>}
      </div>
      <div className="card-body">
        {product.category && <div className="card-cat">{product.category.name}</div>}
        <div className="card-name">{product.name}</div>
        <div className="price-row">
          <span className={discount ? "price sale" : "price"}>{formatPrice(product.price)}</span>
          {discount > 0 && <span className="old-price">{formatPrice(product.oldPrice!)}</span>}
        </div>
      </div>
    </Link>
  );
}
