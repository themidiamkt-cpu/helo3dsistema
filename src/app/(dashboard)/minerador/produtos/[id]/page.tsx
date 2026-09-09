import Link from "next/link";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExternalLink, Star } from "lucide-react";
import { toggleMinerFavoriteAction } from "@/actions/miner";
import { PageShell } from "@/components/layout/page-shell";
import { datePt, lifecycleLabel, money, numberPt, trendLabel } from "@/components/miner/formatters";
import { MinerNav } from "@/components/miner/miner-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMinerContext, getMinerProductDetail } from "@/lib/miner/repository";

export default async function MinerProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await getMinerContext();
  const { id } = await params;
  const { product, snapshots, score, classification, favorite } = await getMinerProductDetail(organizationId, id);
  const latest = snapshots[0];
  return (
    <PageShell title={product.title} description="Detalhe de produto minerado, historico e decisao de teste.">
      <MinerNav />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href={product.url} target="_blank" />}>
          <ExternalLink className="size-4" />
          Abrir anuncio
        </Button>
        <form action={toggleMinerFavoriteAction}>
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="favorite" value={favorite ? "false" : "true"} />
          <Button variant={favorite ? "default" : "outline"}>
            <Star className="size-4" />
            {favorite ? "Favorito" : "Favoritar"}
          </Button>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mercado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>Marketplace: {product.marketplace === "MERCADO_LIVRE" ? "Mercado Livre" : "Shopee"}</p>
            <p>Preco atual: {money(latest?.price)}</p>
            <p>Vendidos acumulado: {numberPt(latest?.sold_quantity)}</p>
            <p>Reviews: {numberPt(latest?.review_count)}</p>
            <p>Visto em: {datePt(product.last_seen_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p className="text-3xl font-semibold">{numberPt(score?.score)}</p>
            <p>Tendencia: {trendLabel(score?.trend)}</p>
            <p>Status: {lifecycleLabel(score?.lifecycle)}</p>
            <div className="flex flex-wrap gap-1">{(score?.reasons ?? []).map((reason: string) => <Badge key={reason} variant="outline">{reason}</Badge>)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>3D/FDM</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>Probabilidade: {classification?.probability_3d_printed ?? "-"}%</p>
            <p>Fabricacao: {classification?.likely_manufacturing ?? "-"}</p>
            <p>Material provavel: {classification?.likely_material ?? "-"}</p>
            <p>Complexidade: {classification?.print_complexity ?? "-"}</p>
            <p className="text-muted-foreground">{classification?.reason ?? "Sem analise ainda."}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historico de snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Preco</TableHead>
                <TableHead>Vendidos</TableHead>
                <TableHead>Fonte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot: any) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{datePt(snapshot.collected_at)}</TableCell>
                  <TableCell>{snapshot.keyword ?? "-"}</TableCell>
                  <TableCell>{money(Number(snapshot.price))}</TableCell>
                  <TableCell>{numberPt(snapshot.sold_quantity)}</TableCell>
                  <TableCell>{snapshot.data_source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
