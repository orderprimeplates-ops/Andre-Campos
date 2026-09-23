import { Field, FormGrid, Input, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { STAFF_ROLE, STAFF_STATUS } from "@/lib/status";
import { centsToInput } from "@/lib/domain/money";

interface A {
  staffMemberId?: string | null; role?: string; rateCents?: number; rateType?: string; callTime?: string | null; endTime?: string | null;
  status?: string; responsibilities?: string | null; actualPayCents?: number | null;
}

export function AssignmentFields({ a = {}, staff, withActual }: { a?: A; staff: { id: string; name: string; role: string; rateCents: number; rateType: string }[]; withActual?: boolean }) {
  return (
    <div className="space-y-4">
      <FormGrid>
        <Field label="Role" name="role">
          <Select id="role" name="role" defaultValue={a.role ?? "SERVER"}>{Object.entries(STAFF_ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="Person" name="staffMemberId" hint="leave open to fill later">
          <Select id="staffMemberId" name="staffMemberId" defaultValue={a.staffMemberId ?? ""}>
            <option value="">Open role — still needed</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {STAFF_ROLE[s.role]} · {centsToInput(s.rateCents)}{s.rateType === "HOURLY" ? "/hr" : " flat"}</option>)}
          </Select>
        </Field>
        <Field label="Rate" name="rate" hint="blank = their usual rate"><MoneyInput id="rate" name="rate" defaultValue={centsToInput(a.rateCents)} /></Field>
        <Field label="Rate type" name="rateType">
          <Select id="rateType" name="rateType" defaultValue={a.rateType ?? "HOURLY"}><option value="HOURLY">Per hour</option><option value="FLAT">Flat per event</option></Select>
        </Field>
        <Field label="Call time" name="callTime"><Input id="callTime" name="callTime" type="time" defaultValue={a.callTime ?? ""} /></Field>
        <Field label="Expected end" name="endTime"><Input id="endTime" name="endTime" type="time" defaultValue={a.endTime ?? ""} /></Field>
        <Field label="Status" name="status">
          <Select id="status" name="status" defaultValue={a.status ?? ""}>
            <option value="">Auto</option>
            {Object.entries(STAFF_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        {withActual && <Field label="Actual pay" name="actualPay" hint="if different"><MoneyInput id="actualPay" name="actualPay" defaultValue={centsToInput(a.actualPayCents)} /></Field>}
      </FormGrid>
      <Field label="Responsibilities" name="responsibilities"><Textarea id="responsibilities" name="responsibilities" rows={2} defaultValue={a.responsibilities ?? ""} /></Field>
    </div>
  );
}
