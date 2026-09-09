import { Plus, Trash2 } from "lucide-react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMinerKeywordAction, deleteMinerKeywordAction, toggleMinerKeywordAction } from "@/actions/miner";
import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMinerContext, getMinerKeywords } from "@/lib/miner/repository";

export default async function MinerKeywordsPage() {
  const { organizationId } = await getMinerContext();
  const keywords = await getMinerKeywords(organizationId);
  return (
    <PageShell title="Keywords" description="Termos monitorados nas buscas de marketplace.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>Nova keyword</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMinerKeywordAction} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <Input name="keyword" placeholder="Ex.: porta controle 3d" />
            <Input name="max_results" type="number" min="1" max="100" defaultValue="50" />
            <Button>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{keywords.length} keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((keyword: any) => (
                <TableRow key={keyword.id}>
                  <TableCell className="font-medium">{keyword.keyword}</TableCell>
                  <TableCell>{keyword.active ? "Ativa" : "Pausada"}</TableCell>
                  <TableCell>{keyword.max_results}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <form action={toggleMinerKeywordAction}>
                        <input type="hidden" name="id" value={keyword.id} />
                        <input type="hidden" name="active" value={keyword.active ? "false" : "true"} />
                        <Button variant="outline" size="sm">{keyword.active ? "Pausar" : "Ativar"}</Button>
                      </form>
                      <form action={deleteMinerKeywordAction}>
                        <input type="hidden" name="id" value={keyword.id} />
                        <Button variant="destructive" size="icon-sm" title="Excluir">
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
