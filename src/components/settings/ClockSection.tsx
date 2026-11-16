import { Collapse } from "@/components/Collapse"
import { FieldLabel, Segmented, SwitchRow } from "@/components/settings/primitives"
import { Slider } from "@/components/ui/slider"
import type { ClockController, ClockInk } from "@/hooks/use-clock-prefs"

const INK_OPTIONS: { id: ClockInk; label: string }[] = [
  { id: "auto", label: "自动" },
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
]

const FACE_OPTIONS = [
  { id: "serif", label: "衬线" },
  { id: "sans", label: "无衬线" },
] as const

export function ClockSection({ clock }: { clock: ClockController }) {
  const { prefs, update } = clock

  return (
    <div className="space-y-4">
      <SwitchRow title="显示时间" checked={prefs.visible} onChange={(visible) => update({ visible })} />

      {/* Collapsed rather than unmounted, so turning it off never jumps the panel. */}
      <Collapse open={prefs.visible}>
        <div className="space-y-4 pb-1">
          <div className="space-y-1.5">
            <FieldLabel>字形</FieldLabel>
            <Segmented
              label="字形"
              value={prefs.serif ? "serif" : "sans"}
              options={FACE_OPTIONS}
              onChange={(id) => update({ serif: id === "serif" })}
            />
          </div>

          <div className="space-y-1">
            <FieldLabel hint={String(prefs.weight)}>字重</FieldLabel>
            <Slider
              aria-label="字重"
              min={300}
              max={800}
              step={10}
              value={[prefs.weight]}
              onValueChange={([weight]) => update({ weight })}
            />
          </div>

          <div className="space-y-1">
            <FieldLabel hint={`${prefs.size}px`}>字号</FieldLabel>
            <Slider
              aria-label="字号"
              min={32}
              max={96}
              step={2}
              value={[prefs.size]}
              onValueChange={([size]) => update({ size })}
            />
          </div>

          <div className="space-y-1">
            <FieldLabel hint={`${prefs.opacity}%`}>不透明度</FieldLabel>
            <Slider
              aria-label="不透明度"
              min={20}
              max={100}
              step={5}
              value={[prefs.opacity]}
              onValueChange={([opacity]) => update({ opacity })}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>墨色</FieldLabel>
            <Segmented
              label="墨色"
              value={prefs.ink}
              options={INK_OPTIONS}
              onChange={(ink) => update({ ink })}
            />
          </div>

          <div>
            <SwitchRow title="显示秒" checked={prefs.seconds} onChange={(seconds) => update({ seconds })} />
            <SwitchRow title="12 小时制" checked={prefs.hour12} onChange={(hour12) => update({ hour12 })} />
          </div>
        </div>
      </Collapse>
    </div>
  )
}
