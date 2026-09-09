import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { datePt } from "@/components/miner/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMinerContext, listMinerJobs } from "@/lib/miner/repository";

export default async function MinerJobsPage() {
  const { organizationId } = await getMinerContext();
  const jobs = await listMinerJobs(organizationId);
  return (
    <PageShell title="Jobs" description="Historico de coletas e falhas por marketplace.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>Ultimas coletas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultados</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job: any) => (
                <TableRow key={job.id}>
                  <TableCell>{datePt(job.created_at)}</TableCell>
                  <TableCell>{job.marketplace ?? "Todos"}</TableCell>
                  <TableCell>{job.keyword ?? "-"}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.results_count}</TableCell>
                  <TableCell className="max-w-[420px] whitespace-normal text-muted-foreground">{job.error_message ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
