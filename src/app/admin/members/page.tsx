"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Eye, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Modal, useFeedback } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Field, Input, Select, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Rank = "Gold" | "Silver" | "Member" | "Platinum";
type Member = { id: string; name: string; alias: string; phone: string; rank: Rank; spend: number; points: number; last: string; daysSinceVisit: number; joinedDays: number; dogs: number; cats: number };
const seedData: Member[] = [
  ["รัชนีญา จันทร์เพ็ญ", "พี่แอน", "081-456-7890", "Gold", 28750, 2875, 0, 2, 0], ["ธีรพล สุขสวัสดิ์", "เฮียต้น", "089-123-4567", "Gold", 24600, 2460, 1, 0, 0], ["ศิริวรรณ คำก้อน", "ป้าหน่อย", "062-987-6543", "Silver", 21380, 2138, 0, 3, 1], ["อนุชา ลิ้มทอง", "น้องชา", "094-321-0987", "Silver", 18950, 1895, 2, 1, 0], ["กาญจนา แซ่ตั้ง", "ปุ้ย", "065-789-2345", "Silver", 17420, 1742, 1, 2, 2], ["สุรเดช พึ่งพา", "เดช", "091-234-5678", "Member", 14860, 1486, 3, 0, 0], ["จิราภรณ์ มากมี", "แหม่ม", "080-555-7788", "Member", 12970, 1297, 0, 4, 5], ["นภัสสร อิ่มใจ", "น้องแนน", "083-444-2211", "Member", 11230, 1123, 1, 1, 10], ["วัชรพงษ์ คงดี", "พี่โต้ง", "092-777-8899", "Gold", 10860, 1086, 2, 0, 32], ["ณัฐชา ศรีสมบัติ", "น้องฟ้า", "098-654-3210", "Silver", 10450, 1045, 0, 2, 45],
].map((row, index) => ({ id: `seed-${index}`, name: String(row[0]), alias: String(row[1]), phone: String(row[2]), rank: row[3] as Rank, spend: Number(row[4]), points: Number(row[5]), dogs: Number(row[6]), cats: Number(row[7]), daysSinceVisit: Number(row[8]), joinedDays: index + 1, last: Number(row[8]) === 0 ? "วันนี้" : `${row[8]} วันที่แล้ว` }));
const columns = ["เบอร์โทร", "แรงค์", "ยอดซื้อ", "แต้ม", "ใช้งานล่าสุด", "สัตว์เลี้ยง"] as const;
type Column = typeof columns[number];

export default function MembersPage() {
  const { notify } = useFeedback();
  const [members, setMembers] = useState(seedData);
  const [group, setGroup] = useState("ทั้งหมด");
  const [rankOpen, setRankOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [period, setPeriod] = useState("สะสมทั้งหมด");
  const [groupPeriod, setGroupPeriod] = useState("30 วัน");
  const [visibleColumns, setVisibleColumns] = useState<Column[]>(["เบอร์โทร", "แรงค์", "ยอดซื้อ", "แต้ม", "ใช้งานล่าสุด"]);
  const [draftColumns, setDraftColumns] = useState<Column[]>(visibleColumns);
  const [petFilter, setPetFilter] = useState("ทั้งหมด");
  const [modal, setModal] = useState<"add" | "filter" | "columns" | "custom" | "detail" | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [selectedAlias, setSelectedAlias] = useState("");
  const [newMember, setNewMember] = useState({ phone: "", name: "", alias: "" });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("members").select("id,full_name,admin_alias,phone,total_spend,points_balance,dog_count,cat_count,last_active_at,created_at,ranks(name)").order("total_spend", { ascending: false }).then(({ data, error }) => {
      if (error || !data?.length) return;
      const now = Date.now();
      setMembers(data.map((item) => { const lastTime = item.last_active_at ? new Date(item.last_active_at).getTime() : now; const joinedTime = new Date(item.created_at).getTime(); const related = item.ranks as unknown as { name?: string } | null; return { id: item.id, name: item.full_name, alias: item.admin_alias || item.full_name, phone: item.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"), rank: (related?.name ?? "Member") as Rank, spend: Number(item.total_spend), points: item.points_balance, last: item.last_active_at ? new Date(item.last_active_at).toLocaleDateString("th-TH", { dateStyle: "medium" }) : "ยังไม่เคยซื้อ", daysSinceVisit: Math.floor((now - lastTime) / 86400000), joinedDays: Math.floor((now - joinedTime) / 86400000), dogs: item.dog_count, cats: item.cat_count }; }));
    });
  }, []);

  const rows = useMemo(() => members.filter((member) => {
    const inGroup = group === "ทั้งหมด" || group === "ลูกค้าใหม่" && member.joinedDays <= Number(groupPeriod.split(" ")[0] || 30) || group === "ไม่ได้กลับมา" && member.daysSinceVisit >= Number(groupPeriod.split(" ")[0] || 30) || ["Gold", "Silver", "Member", "Platinum"].includes(group) && member.rank === group;
    const searchMatch = `${member.name}${member.alias}${member.phone}`.toLowerCase().includes(query.toLowerCase().trim());
    const petsMatch = petFilter === "ทั้งหมด" || petFilter === "มีสุนัข" && member.dogs > 0 || petFilter === "มีแมว" && member.cats > 0;
    return inGroup && searchMatch && petsMatch;
  }).sort((a, b) => ascending ? a.spend - b.spend : b.spend - a.spend), [members, group, groupPeriod, query, petFilter, ascending]);

  const exportCsv = () => {
    const csv = ["ชื่อ,ชื่อเรียก,เบอร์โทร,แรงค์,ยอดซื้อ,แต้ม,ใช้งานล่าสุด", ...rows.map((member) => `${member.name},${member.alias},${member.phone},${member.rank},${member.spend},${member.points},${member.last}`)].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tammy-members.csv"; anchor.click(); URL.revokeObjectURL(url);
    notify(`ส่งออกสมาชิก ${rows.length} รายการแล้ว`);
  };

  const addMember = async () => {
    const digits = newMember.phone.replace(/\D/g, "");
    if (!/^0\d{8,9}$/.test(digits) || !newMember.name.trim()) { notify("กรุณากรอกชื่อและเบอร์โทรให้ถูกต้อง", "info"); return; }
    const supabase = createClient();
    const { data: memberRank } = await supabase.from("ranks").select("id").eq("name", "Member").maybeSingle();
    const { data, error } = await supabase.from("members").insert({ phone: digits, full_name: newMember.name.trim(), admin_alias: newMember.alias.trim() || null, rank_id: memberRank?.id ?? null, total_spend: 0, points_balance: 0 }).select("id").single();
    if (error) { notify(error.code === "23505" ? "เบอร์โทรศัพท์นี้เป็นสมาชิกแล้ว" : "เพิ่มสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง", "info"); return; }
    setMembers((current) => [{ id: data.id, name: newMember.name, alias: newMember.alias || newMember.name, phone: digits.replace(/(\d{3})(\d{3})(\d+)/, "$1-$2-$3"), rank: "Member", spend: 0, points: 0, last: "ยังไม่เคยซื้อ", daysSinceVisit: 0, joinedDays: 0, dogs: 0, cats: 0 }, ...current]);
    setNewMember({ phone: "", name: "", alias: "" }); setModal(null); notify("เพิ่มสมาชิกเรียบร้อยแล้ว");
  };

  const openDetail = (member: Member) => { setSelected(member); setSelectedAlias(member.alias); setModal("detail"); };
  const show = (column: Column) => visibleColumns.includes(column);

  return <div className="mx-auto max-w-[1500px] animate-rise">
    <PageHeader title="สมาชิก" description="ค้นหา จัดกลุ่ม และวิเคราะห์ข้อมูลสมาชิก" action={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setModal("add")}>เพิ่มสมาชิก</Button>} />

    <Surface className="mb-4 overflow-visible p-2"><div className="flex flex-wrap items-center gap-1">
      {[{ label: "ทั้งหมด", count: members.length }, { label: "ลูกค้าใหม่", count: members.filter((item) => item.joinedDays <= 30).length }, { label: "ไม่ได้กลับมา", count: members.filter((item) => item.daysSinceVisit >= 30).length }].map((item) => <button type="button" key={item.label} onClick={() => setGroup(item.label)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition ${group === item.label ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>{item.label} <span className="opacity-60">({item.count.toLocaleString()})</span></button>)}
      <div className="relative"><button type="button" aria-expanded={rankOpen} onClick={() => setRankOpen((value) => !value)} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${["Gold", "Silver", "Member", "Platinum"].includes(group) ? "bg-[var(--brand-50)] text-[var(--brand-600)]" : "text-stone-600 hover:bg-stone-50"}`}>แรงค์{["Gold", "Silver", "Member", "Platinum"].includes(group) ? `: ${group}` : ""}<ChevronDown size={16} /></button>{rankOpen ? <div className="absolute left-0 top-12 z-30 w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-xl animate-pop">{["Member", "Silver", "Gold", "Platinum"].map((rank) => <button type="button" key={rank} onClick={() => { setGroup(rank); setRankOpen(false); }} className="flex w-full justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-stone-50"><span>{rank}</span><span className="text-stone-400">{members.filter((item) => item.rank === rank).length} คน</span></button>)}</div> : null}</div>
      {["ลูกค้าใหม่", "ไม่ได้กลับมา"].includes(group) ? <div className="ml-auto flex flex-wrap gap-1">{["วันนี้", "7 วัน", "30 วัน", "กำหนดเอง"].map((item) => <button type="button" key={item} onClick={() => item === "กำหนดเอง" ? setModal("custom") : setGroupPeriod(item)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${groupPeriod === item ? "bg-[var(--brand-50)] text-[var(--brand-600)]" : "text-stone-500 hover:bg-stone-50"}`}>{item}</button>)}</div> : null}
    </div></Surface>

    <Surface className="overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-stone-100 p-4"><div className="control flex min-w-[250px] flex-1 items-center gap-2 px-3"><Search size={18} className="text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="ค้นหาชื่อ ชื่อเรียกในร้าน หรือเบอร์โทร" /></div><Button icon={<Filter size={17} />} onClick={() => setModal("filter")}>ตัวกรอง</Button><Button icon={<SlidersHorizontal size={17} />} onClick={() => { setDraftColumns(visibleColumns); setModal("columns"); }}>เลือกคอลัมน์</Button><Button icon={<Download size={17} />} onClick={exportCsv}>ส่งออก CSV</Button></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 p-3 text-sm"><span className="font-semibold">ยอดซื้อ</span><Button size="sm" variant={!ascending ? "primary" : "ghost"} onClick={() => setAscending(false)}>มาก → น้อย</Button><Button size="sm" variant={ascending ? "primary" : "ghost"} onClick={() => setAscending(true)}>น้อย → มาก</Button><div className="ml-auto flex flex-wrap gap-1">{["สะสมทั้งหมด", "30 วัน", "90 วัน", "กำหนดช่วงเวลา"].map((item) => <Button key={item} size="sm" variant={period === item ? "primary" : "ghost"} onClick={() => item === "กำหนดช่วงเวลา" ? setModal("custom") : setPeriod(item)}>{item}</Button>)}</div></div>
      <div className="max-h-[calc(100vh-330px)] min-h-[480px] overflow-auto soft-scroll"><table className="w-full min-w-[850px] border-collapse text-sm"><thead className="sticky top-0 z-10 bg-[#fbfaf9] text-left"><tr><th className="border-b border-stone-200 px-4 py-3">อันดับ</th><th className="border-b border-stone-200 px-4 py-3">ชื่อลูกค้า</th>{show("เบอร์โทร") ? <th className="border-b border-stone-200 px-4 py-3">เบอร์โทร</th> : null}{show("แรงค์") ? <th className="border-b border-stone-200 px-4 py-3">แรงค์</th> : null}{show("ยอดซื้อ") ? <th className="border-b border-stone-200 px-4 py-3">ยอดซื้อ</th> : null}{show("แต้ม") ? <th className="border-b border-stone-200 px-4 py-3">แต้ม</th> : null}{show("ใช้งานล่าสุด") ? <th className="border-b border-stone-200 px-4 py-3">ใช้งานล่าสุด</th> : null}{show("สัตว์เลี้ยง") ? <th className="border-b border-stone-200 px-4 py-3">สัตว์เลี้ยง</th> : null}<th className="border-b border-stone-200 px-4 py-3"><span className="sr-only">ดูรายละเอียด</span></th></tr></thead><tbody>{rows.map((member, index) => <tr key={member.id} className="table-row content-auto border-b border-stone-100"><td className="px-4 py-3 text-stone-400">{index + 1}</td><td className="px-4 py-3"><b className="block text-stone-800">{member.name}</b><small className="text-stone-400">{member.alias} · เฉพาะพนักงาน</small></td>{show("เบอร์โทร") ? <td className="px-4 py-3">{member.phone}</td> : null}{show("แรงค์") ? <td className="px-4 py-3"><Badge tone={member.rank === "Gold" ? "warning" : member.rank === "Member" ? "success" : "neutral"}>{member.rank}</Badge></td> : null}{show("ยอดซื้อ") ? <td className="px-4 py-3 font-semibold">฿{member.spend.toLocaleString()}</td> : null}{show("แต้ม") ? <td className="px-4 py-3">{member.points.toLocaleString()}</td> : null}{show("ใช้งานล่าสุด") ? <td className="px-4 py-3 text-stone-500">{member.last}</td> : null}{show("สัตว์เลี้ยง") ? <td className="px-4 py-3">สุนัข {member.dogs} · แมว {member.cats}</td> : null}<td className="px-4 py-3"><button type="button" aria-label={`ดู ${member.name}`} onClick={() => openDetail(member)} className="grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Eye size={17} /></button></td></tr>)}</tbody></table>{rows.length === 0 ? <div className="p-12 text-center text-sm text-stone-500">ไม่พบสมาชิกตามตัวกรอง</div> : <div className="p-4 text-center text-xs text-stone-400">แสดง {rows.length} รายการ · เลื่อนลงเพื่อดูต่อ</div>}</div>
    </Surface>

    <Modal open={modal === "add"} title="เพิ่มสมาชิก" description="สมัครสมาชิกด้วยเบอร์โทรศัพท์เท่านั้น" onClose={() => setModal(null)}><div className="space-y-4"><Field label="เบอร์โทรศัพท์ *"><Input value={newMember.phone} onChange={(event) => setNewMember({ ...newMember, phone: event.target.value })} placeholder="081-234-5678" inputMode="tel" /></Field><Field label="ชื่อ–นามสกุล *"><Input value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} /></Field><Field label="ชื่อเรียกในร้าน" hint="เฉพาะพนักงาน ลูกค้าจะไม่เห็น"><Input value={newMember.alias} onChange={(event) => setNewMember({ ...newMember, alias: event.target.value })} /></Field><Button variant="primary" className="w-full" onClick={addMember}>บันทึกสมาชิก</Button></div></Modal>
    <Modal open={modal === "filter"} title="ตัวกรองสมาชิก" onClose={() => setModal(null)}><Field label="สัตว์เลี้ยง"><Select value={petFilter} onChange={(event) => setPetFilter(event.target.value)}><option>ทั้งหมด</option><option>มีสุนัข</option><option>มีแมว</option></Select></Field><Button variant="primary" className="mt-5 w-full" onClick={() => { setModal(null); notify("ใช้ตัวกรองแล้ว"); }}>ใช้ตัวกรอง</Button></Modal>
    <Modal open={modal === "columns"} title="เลือกคอลัมน์ที่แสดง" onClose={() => setModal(null)}><div className="grid grid-cols-2 gap-2">{columns.map((column) => <label key={column} className="control flex items-center gap-2 px-3 text-sm"><input type="checkbox" checked={draftColumns.includes(column)} onChange={() => setDraftColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column])} />{column}</label>)}</div><Button variant="primary" className="mt-5 w-full" onClick={() => { setVisibleColumns(draftColumns); setModal(null); notify("บันทึกคอลัมน์แล้ว"); }}>บันทึก</Button></Modal>
    <Modal open={modal === "custom"} title="กำหนดช่วงเวลา" onClose={() => setModal(null)}><div className="grid gap-3 sm:grid-cols-2"><Field label="วันที่เริ่มต้น"><Input type="date" /></Field><Field label="วันที่สิ้นสุด"><Input type="date" /></Field></div><Button variant="primary" className="mt-5 w-full" onClick={() => { setPeriod("กำหนดช่วงเวลา"); setGroupPeriod("กำหนดเอง"); setModal(null); notify("ใช้ช่วงเวลาที่กำหนดแล้ว"); }}>ใช้ช่วงเวลา</Button></Modal>
    <Modal open={modal === "detail" && Boolean(selected)} title="ข้อมูลสมาชิก" onClose={() => setModal(null)}>{selected ? <div><div className="surface-subtle p-4"><b>{selected.name}</b><p className="mt-1 text-sm text-stone-500">{selected.phone}</p></div><div className="mt-4"><Field label="ชื่อที่พนักงานจำ" hint="ใช้ค้นหาและเลือกให้แต้มได้เร็วขึ้น ลูกค้าจะไม่เห็นข้อมูลนี้"><Input value={selectedAlias} onChange={(event) => setSelectedAlias(event.target.value)} placeholder="เช่น พี่อ้อย หรือ เฮียต้น" /></Field></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="surface-subtle p-3"><dt className="text-stone-500">แรงค์</dt><dd className="mt-1 font-bold">{selected.rank}</dd></div><div className="surface-subtle p-3"><dt className="text-stone-500">แต้ม</dt><dd className="mt-1 font-bold">{selected.points.toLocaleString()}</dd></div><div className="surface-subtle p-3"><dt className="text-stone-500">ยอดซื้อ</dt><dd className="mt-1 font-bold">฿{selected.spend.toLocaleString()}</dd></div><div className="surface-subtle p-3"><dt className="text-stone-500">สัตว์เลี้ยง</dt><dd className="mt-1 font-bold">สุนัข {selected.dogs} · แมว {selected.cats}</dd></div></dl><Button variant="primary" className="mt-5 w-full" onClick={async () => { const { error } = await createClient().from("members").update({ admin_alias: selectedAlias.trim() || null }).eq("id", selected.id); if (error) { notify("บันทึกชื่อที่จำไม่สำเร็จ", "info"); return; } setMembers((current) => current.map((item) => item.id === selected.id ? { ...item, alias: selectedAlias.trim() || item.name } : item)); setSelected(null); setModal(null); notify("บันทึกชื่อที่พนักงานจำแล้ว"); }}>บันทึกข้อมูลสมาชิก</Button></div> : null}</Modal>
  </div>;
}
