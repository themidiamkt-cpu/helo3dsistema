import Link from "next/link";
import { Star } from "lucide-react";
import { toggleMinerFavoriteAction } from "@/actions/miner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MinerProductWithScore } from "@/lib/miner/repository";
import { lifecycleLabel, money, numberPt, trendLabel } from "./formatters";

export function MinerProductTable({ products }: { products: Array<MinerProductWithScore & { is_favorite?: boolean }> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Marketplace</TableHead>
          <TableHead>Preco</TableHead>
          <TableHead>Vendidos</TableHead>
          <TableHead>3D</TableHead>
          <TableHead>Tendencia</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Acoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="max-w-[360px] whitespace-normal font-medium">
              <Link href={`/minerador/produtos/${product.id}`} className="hover:underline">
                {product.title}
              </Link>
              {product.demo ? <Badge className="ml-2" variant="outline">demo</Badge> : null}
            </TableCell>
            <TableCell>{product.marketplace === "MERCADO_LIVRE" ? "Mercado Livre" : "Shopee"}</TableCell>
            <TableCell>{money(product.latest_price)}</TableCell>
            <TableCell>{numberPt(product.latest_sold_quantity)}</TableCell>
            <TableCell>{product.probability_3d_printed ?? "-"}%</TableCell>
            <TableCell>{trendLabel(product.trend)}</TableCell>
            <TableCell>
              <Badge variant={(product.score ?? 0) >= 70 ? "default" : "secondary"}>{numberPt(product.score)}</Badge>
            </TableCell>
            <TableCell>{lifecycleLabel(product.lifecycle)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" render={<Link href={product.url} target="_blank" />}>Abrir</Button>
                <form action={toggleMinerFavoriteAction}>
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="favorite" value={product.is_favorite ? "false" : "true"} />
                  <Button variant={product.is_favorite ? "default" : "outline"} size="icon-sm" title="Favoritar">
                    <Star className="size-4" />
                  </Button>
                </form>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
