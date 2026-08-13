import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { eventsAdminApi, uploadsAdminApi } from "@/lib/api";
import { CustomSelect } from "../../sessions/CustomSelect";
import RichTextEditor from "@/components/ui/RichTextEditor";

type Role = "nam" | "nu";
type Level = "A" | "B+" | "B" | "C";

interface CompositionSlot {
    role: Role;
    level: Level | null;
    label: string;
}

interface MatchContentItem {
    id: string;
    label: string;
}

interface ScoringState {
    set_type: string;
    points_per_set: string;
    win_margin: string;
    max_score: string;
}

interface RulesState {
    captain_female_content: string;
    draw_teams_content: string;
    match_contents: MatchContentItem[];
    format_content: string;
    scoring: ScoringState;
    ranking_rules_content: string;
    rules_content: string;
}

interface TournamentFormState {
    title: string;
    slug: string;
    emoji: string;
    format_type: "don" | "doi_bong";
    event_date: string;
    deadline: string;
    status: string;
    location: string;
    description: string;
    cover_image_url: string;
    logo_url: string;
    registration_start_date: string;
    registration_end_date: string;
    show_on_homepage: boolean;
    display_order: string;
    show_registration_list: boolean;
    admin_notes: string;
    team_size: 4 | 6;
    max_teams: string;
    entry_fee_per_person: string;
    composition: CompositionSlot[];
    rules: RulesState;
}

const FORMAT_TYPE_OPTIONS = [
    { value: "don", label: "Đơn" },
    { value: "doi_bong", label: "Đồng đội" },
];

const SLOT_OPTIONS: CompositionSlot[] = [
    { role: "nam", level: "A", label: "Nam A" },
    { role: "nam", level: "B+", label: "Nam B+" },
    { role: "nam", level: "B", label: "Nam B" },
    { role: "nam", level: "C", label: "Nam C" },
    { role: "nu", level: null, label: "Nữ" },
];

const slotOptionKey = (role: Role, level: Level | null) =>
    `${role}_${level ?? "x"}`;

const DEFAULT_SLOT: CompositionSlot = { role: "nu", level: null, label: "Nữ" };

const SET_TYPE_OPTIONS = ["01 set", "02 set (best of 2)", "03 set (best of 3)"];

const genId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_MATCH_CONTENTS: MatchContentItem[] = [
    { id: genId(), label: "Đôi Nam" },
    { id: genId(), label: "Đôi Nam - Nữ" },
];

const defaultRules = (): RulesState => ({
    captain_female_content: "",
    draw_teams_content: "",
    match_contents: DEFAULT_MATCH_CONTENTS.map((m) => ({ ...m })),
    format_content: "",
    scoring: {
        set_type: SET_TYPE_OPTIONS[0],
        points_per_set: "21",
        win_margin: "2",
        max_score: "30",
    },
    ranking_rules_content: "",
    rules_content: "",
});

function slugify(input: string): string {
    return input
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function resizeComposition(
    current: CompositionSlot[],
    size: number,
): CompositionSlot[] {
    if (current.length === size) return current;
    if (current.length > size) return current.slice(0, size);
    return [
        ...current,
        ...Array.from({ length: size - current.length }, () => ({
            ...DEFAULT_SLOT,
        })),
    ];
}

function defaultComposition(size: 4 | 6): CompositionSlot[] {
    const base: CompositionSlot[] = [
        { role: "nam", level: "A", label: "Nam A" },
        { role: "nam", level: "B+", label: "Nam B+" },
        { role: "nam", level: "B", label: "Nam B" },
        { role: "nu", level: null, label: "Nữ" },
    ];
    if (size === 4) return base;
    return [
        ...base,
        { role: "nam", level: "C", label: "Nam C" },
        { role: "nu", level: null, label: "Nữ" },
    ];
}

const TABS = [
    { key: "info", label: "Thông tin giải đấu" },
    { key: "prizes", label: "Giải thưởng" },
    { key: "fees", label: "Lệ phí" },
    { key: "preview", label: "Xem trước" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_OPTIONS = [
    { value: "draft", label: "Nháp" },
    { value: "open", label: "Mở đăng ký" },
    { value: "closed", label: "Đã đóng đăng ký" },
    { value: "ongoing", label: "Đang diễn ra" },
    { value: "completed", label: "Đã kết thúc" },
    { value: "cancelled", label: "Đã huỷ" },
];

const MATCH_CONTENT_OPTIONS = [
    { value: "Đôi Nam", label: "Đôi Nam" },
    { value: "Đôi Nam - Nữ", label: "Đôi Nam - Nữ" },
    { value: "Đôi Nữ", label: "Đôi Nữ" },
    { value: "Đơn", label: "Đơn" },
];

function getMatchContentVisual(label: string) {
    switch (label) {
        case "Đôi Nữ":
            return {
                background: "linear-gradient(135deg,#c2185b,#e64980)",
                icon: <TwoPeopleIcon />,
            };
        case "Đôi Nam - Nữ":
            return {
                background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                icon: <TwoPeopleIcon />,
            };
        case "Đơn":
            return {
                background: "linear-gradient(135deg,#374151,#6b7280)",
                icon: <OnePersonIcon />,
            };
        case "Đôi Nam":
        default:
            return {
                background: "linear-gradient(135deg,#1c3d5a,#2c5985)",
                icon: <TwoPeopleIcon />,
            };
    }
}

const initialForm: TournamentFormState = {
    title: "",
    slug: "",
    emoji: "🏆",
    format_type: "doi_bong",
    event_date: "",
    deadline: "",
    status: "draft",
    location: "",
    description: "",
    cover_image_url: "",
    logo_url: "",
    registration_start_date: "",
    registration_end_date: "",
    show_on_homepage: true,
    display_order: "1",
    show_registration_list: true,
    admin_notes: "",
    team_size: 4,
    max_teams: "",
    entry_fee_per_person: "",
    composition: defaultComposition(4),
    rules: defaultRules(),
};

export default function TournamentForm({
    activityId,
    onSaved,
    onClose,
}: {
    activityId?: string;
    onSaved?: () => void;
    onClose?: () => void;
} = {}) {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = activityId ?? params?.id;

    const [activeTab, setActiveTab] = useState<TabKey>("info");
    const [form, setForm] = useState<TournamentFormState>(initialForm);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [slugTouched, setSlugTouched] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!id) return;
        eventsAdminApi
            .get(id)
            .then(({ data }) => {
                const detail = data.detail ?? {};
                const teamSize: 4 | 6 = detail.team_size === 6 ? 6 : 4;
                const composition: CompositionSlot[] =
                    Array.isArray(detail.composition) && detail.composition.length
                        ? detail.composition.map((c: any) => ({
                            role: c.role,
                            level: c.role === "nu" ? null : c.level,
                            label: c.label ?? (c.role === "nu" ? "Nữ" : `Nam ${c.level}`),
                        }))
                        : defaultComposition(teamSize);

                const rulesData = detail.rules ?? {};
                const rules: RulesState = {
                    captain_female_content: rulesData.captain_female_content ?? "",
                    draw_teams_content: rulesData.draw_teams_content ?? "",
                    match_contents:
                        Array.isArray(rulesData.match_contents) &&
                            rulesData.match_contents.length
                            ? rulesData.match_contents.map((m: any) => ({
                                id: m.id ?? genId(),
                                label: m.label ?? "",
                            }))
                            : DEFAULT_MATCH_CONTENTS.map((m) => ({ ...m })),
                    format_content: rulesData.format_content ?? "",
                    scoring: {
                        set_type: rulesData.scoring?.set_type ?? SET_TYPE_OPTIONS[0],
                        points_per_set:
                            rulesData.scoring?.points_per_set != null
                                ? String(rulesData.scoring.points_per_set)
                                : "21",
                        win_margin:
                            rulesData.scoring?.win_margin != null
                                ? String(rulesData.scoring.win_margin)
                                : "2",
                        max_score:
                            rulesData.scoring?.max_score != null
                                ? String(rulesData.scoring.max_score)
                                : "30",
                    },
                    ranking_rules_content: rulesData.ranking_rules_content ?? "",
                    rules_content: rulesData.rules_content ?? "",
                };

                setForm({
                    title: data.title ?? "",
                    slug: data.slug ?? "",
                    emoji: data.emoji ?? "🏆",
                    format_type: detail.format_type === "don" ? "don" : "doi_bong",
                    event_date: data.event_date ? data.event_date.slice(0, 16) : "",
                    deadline: data.deadline ? data.deadline.slice(0, 16) : "",
                    status: data.status ?? "draft",
                    location: data.location ?? "",
                    description: data.description ?? "",
                    cover_image_url: data.cover_image_url ?? "",
                    logo_url: data.logo_url ?? "",
                    registration_start_date: data.registration_start_date
                        ? data.registration_start_date.slice(0, 10)
                        : "",
                    registration_end_date: data.registration_end_date
                        ? data.registration_end_date.slice(0, 10)
                        : "",
                    show_on_homepage: data.show_on_homepage ?? true,
                    display_order:
                        data.display_order != null ? String(data.display_order) : "1",
                    show_registration_list: data.show_registration_list ?? true,
                    admin_notes: data.admin_notes ?? "",
                    team_size: teamSize,
                    max_teams: detail.max_teams != null ? String(detail.max_teams) : "",
                    entry_fee_per_person:
                        detail.entry_fee_per_person != null
                            ? String(detail.entry_fee_per_person)
                            : "",
                    composition: resizeComposition(composition, teamSize),
                    rules,
                });
                if (data.slug) setSlugTouched(true);
            })
            .catch(() => toast.error("Không tải được dữ liệu giải đấu"))
            .finally(() => setLoading(false));
    }, [id]);

    const remainingDescChars = 160 - form.description.length;

    const handleTitleChange = (title: string) => {
        setForm((f) => ({
            ...f,
            title,
            slug: slugTouched ? f.slug : slugify(title),
        }));
    };

    const handleSlugChange = (slug: string) => {
        setSlugTouched(true);
        setForm((f) => ({ ...f, slug: slugify(slug) }));
    };

    const handleTeamSizeChange = (size: 4 | 6) => {
        setForm((f) => ({
            ...f,
            team_size: size,
            composition: resizeComposition(f.composition, size),
        }));
    };

    const handleSlotChange = (index: number, key: string) => {
        const option = SLOT_OPTIONS.find(
            (o) => slotOptionKey(o.role, o.level) === key,
        );
        if (!option) return;
        setForm((f) => {
            const next = [...f.composition];
            next[index] = { ...option };
            return { ...f, composition: next };
        });
    };

    const setRules = (patch: Partial<RulesState>) => {
        setForm((f) => ({ ...f, rules: { ...f.rules, ...patch } }));
    };

    const setScoring = (patch: Partial<ScoringState>) => {
        setForm((f) => ({
            ...f,
            rules: { ...f.rules, scoring: { ...f.rules.scoring, ...patch } },
        }));
    };

    const addMatchContent = () => {
        setForm((f) => ({
            ...f,
            rules: {
                ...f.rules,
                match_contents: [
                    ...f.rules.match_contents,
                    { id: genId(), label: MATCH_CONTENT_OPTIONS[0].value },
                ],
            },
        }));
    };

    const updateMatchContent = (itemId: string, label: string) => {
        setForm((f) => ({
            ...f,
            rules: {
                ...f.rules,
                match_contents: f.rules.match_contents.map((m) =>
                    m.id === itemId ? { ...m, label } : m,
                ),
            },
        }));
    };

    const removeMatchContent = (itemId: string) => {
        setForm((f) => ({
            ...f,
            rules: {
                ...f.rules,
                match_contents: f.rules.match_contents.filter((m) => m.id !== itemId),
            },
        }));
    };

    const handleUploadFile = async (
        file: File,
        folder: "logos" | "banners",
        field: "logo_url" | "cover_image_url",
        setUploading: (v: boolean) => void,
    ) => {
        setUploading(true);
        try {
            const { data } = await uploadsAdminApi.upload(file, folder);
            setForm((f) => ({ ...f, [field]: data.url }));
            toast.success("Đã tải ảnh lên");
        } catch {
            toast.error("Tải ảnh lên thất bại");
        } finally {
            setUploading(false);
        }
    };

    const validate = (): string | null => {
        if (!form.title.trim()) return "Vui lòng nhập tên giải đấu";
        if (!form.event_date) return "Vui lòng chọn thời gian thi đấu";
        if (
            form.deadline &&
            form.event_date &&
            new Date(form.deadline) > new Date(form.event_date)
        ) {
            return "Ngày chốt đăng ký phải trước ngày thi đấu";
        }
        if (
            form.registration_start_date &&
            form.registration_end_date &&
            new Date(form.registration_start_date) >
            new Date(form.registration_end_date)
        ) {
            return "Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký";
        }
        const maxTeamsNum = Number(form.max_teams);
        if (!form.max_teams || !Number.isInteger(maxTeamsNum) || maxTeamsNum < 1) {
            return "Số lượng đội tham gia không hợp lệ";
        }
        if (form.format_type === "doi_bong") {
            if (form.composition.length !== form.team_size) {
                return "Thành phần mỗi đội chưa khớp với số người/đội";
            }
            for (const slot of form.composition) {
                if (slot.role === "nam" && !slot.level) {
                    return "Vui lòng chọn trình độ cho từng ô Nam trong thành phần đội";
                }
            }
        }
        return null;
    };

    const handleSubmit = async (statusOverride?: string) => {
        const error = validate();
        if (error) return toast.error(error);

        setSaving(true);
        try {
            const payload = {
                type: "tournament",
                title: form.title,
                slug: form.slug || undefined,
                emoji: form.emoji,
                event_date: form.event_date,
                deadline: form.deadline || undefined,
                status: statusOverride ?? form.status,
                location: form.location || undefined,
                description: form.description || undefined,
                cover_image_url: form.cover_image_url || undefined,
                logo_url: form.logo_url || undefined,
                registration_start_date: form.registration_start_date || undefined,
                registration_end_date: form.registration_end_date || undefined,
                show_on_homepage: form.show_on_homepage,
                display_order: form.display_order ? Number(form.display_order) : 1,
                show_registration_list: form.show_registration_list,
                admin_notes: form.admin_notes || undefined,
                detail: {
                    format_type: form.format_type,
                    team_size: form.team_size,
                    max_teams: Number(form.max_teams),
                    composition: form.composition.map(({ role, level, label }) => ({
                        role,
                        level: role === "nu" ? null : level,
                        label,
                    })),
                    entry_fee_per_person: form.entry_fee_per_person
                        ? Number(form.entry_fee_per_person)
                        : 0,
                    rules: {
                        captain_female_content:
                            form.rules.captain_female_content || undefined,
                        draw_teams_content: form.rules.draw_teams_content || undefined,
                        match_contents: form.rules.match_contents
                            .filter((m) => m.label.trim())
                            .map(({ id: matchId, label }) => ({ id: matchId, label })),
                        format_content: form.rules.format_content || undefined,
                        scoring: {
                            set_type: form.rules.scoring.set_type,
                            points_per_set: form.rules.scoring.points_per_set
                                ? Number(form.rules.scoring.points_per_set)
                                : undefined,
                            win_margin: form.rules.scoring.win_margin
                                ? Number(form.rules.scoring.win_margin)
                                : undefined,
                            max_score: form.rules.scoring.max_score
                                ? Number(form.rules.scoring.max_score)
                                : undefined,
                        },
                        ranking_rules_content:
                            form.rules.ranking_rules_content || undefined,
                        rules_content: form.rules.rules_content || undefined,
                    },
                },
            };
            if (id) await eventsAdminApi.update(id, payload);
            else await eventsAdminApi.create(payload);

            toast.success("Đã lưu giải đấu");
            if (onSaved) onSaved();
            else router.push("/activities");
        } catch {
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (onClose) onClose();
        else router.push("/admin/events");
    };

    if (loading)
        return (
            <div className="w-full p-8 text-center text-gray-400">Đang tải...</div>
        );

    return (
        <div className="w-full p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        aria-label="Quay lại"
                    >
                        ←
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">
                        {id ? "Chỉnh sửa giải đấu" : "Tạo giải đấu"}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSubmit("draft")}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Lưu nháp
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => handleSubmit("open")}
                        className="btn-primary disabled:opacity-50"
                    >
                        {saving ? "Đang lưu..." : "Xuất bản"}
                    </button>
                </div>
            </div>

            <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${activeTab === tab.key
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "info" && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
                    <div className="space-y-6 min-w-0">
                        <SectionCard icon="📅" title="I. THỜI GIAN – ĐỊA ĐIỂM">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Thời gian" required>
                                    <input
                                        type="datetime-local"
                                        className="input-field"
                                        value={form.event_date}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, event_date: e.target.value }))
                                        }
                                    />
                                </Field>
                                <Field label="Địa điểm">
                                    <input
                                        className="input-field"
                                        placeholder="Sân cầu lông..."
                                        value={form.location}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, location: e.target.value }))
                                        }
                                    />
                                </Field>
                            </div>
                        </SectionCard>

                        <SectionCard icon="👥" title="II. HÌNH THỨC VÀ ĐỐI TƯỢNG THAM GIA">
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <Field label="Hình thức thi đấu" required>
                                    <CustomSelect
                                        value={form.format_type}
                                        onChange={(v) =>
                                            setForm((f) => ({
                                                ...f,
                                                format_type: v as "don" | "doi_bong",
                                            }))
                                        }
                                        options={FORMAT_TYPE_OPTIONS}
                                    />
                                </Field>
                                <Field
                                    label={
                                        form.format_type === "don"
                                            ? "Số lượng người tham gia"
                                            : "Số lượng đội tham gia"
                                    }
                                    required
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            className="input-field"
                                            placeholder="VD: 7"
                                            value={form.max_teams}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, max_teams: e.target.value }))
                                            }
                                        />
                                        <span className="text-sm text-gray-500 shrink-0">
                                            {form.format_type === "don" ? "người" : "đội"}
                                        </span>
                                    </div>
                                </Field>
                            </div>

                            {form.format_type === "doi_bong" && (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Thành phần mỗi đội <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                                            {[4, 6].map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => handleTeamSizeChange(size as 4 | 6)}
                                                    className={`px-3 py-1.5 font-medium ${form.team_size === size
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-gray-500 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {size} người
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {form.composition.map((slot, i) => (
                                            <CompositionSlotCard
                                                key={i}
                                                slot={slot}
                                                onChange={(key) => handleSlotChange(i, key)}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Mỗi ô là 1 vị trí trong đội. Hệ thống dùng thành phần này để
                                        kiểm tra slot còn trống khi thành viên đăng ký, và để bốc
                                        thăm chia đội.
                                    </p>
                                </>
                            )}
                        </SectionCard>

                        <SectionCard icon="🎖️" title="III. ĐỘI TRƯỞNG VÀ BỐC THĂM CHIA ĐỘI">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="1. Đội trưởng nữ" required>
                                    <RichTextEditor
                                        value={form.rules.captain_female_content}
                                        onChange={(html) =>
                                            setRules({ captain_female_content: html })
                                        }
                                        placeholder="Nhận thông báo từ BTC, nộp danh sách thi đấu từng vòng..."
                                    />
                                </Field>
                                <Field label="2. Bốc thăm chia đội" required>
                                    <RichTextEditor
                                        value={form.rules.draw_teams_content}
                                        onChange={(html) => setRules({ draw_teams_content: html })}
                                        placeholder="Các đội trưởng nữ có mặt sớm để bốc thăm chia đội..."
                                    />
                                </Field>
                            </div>
                        </SectionCard>

                        <SectionCard icon="📋" title="III. NỘI DUNG THI ĐẤU">
                            <label className="text-sm font-medium text-gray-700">
                                Nội dung thi đấu <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2 mt-2">
                                {form.rules.match_contents.map((item) => {
                                    const visual = getMatchContentVisual(item.label);
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                                        >
                                            <span className="text-gray-300 cursor-grab select-none">
                                                ⠿
                                            </span>
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: visual.background }}
                                            >
                                                {visual.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CustomSelect
                                                    value={item.label}
                                                    onChange={(v) => updateMatchContent(item.id, v)}
                                                    options={MATCH_CONTENT_OPTIONS}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeMatchContent(item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={addMatchContent}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400"
                            >
                                <Plus className="w-4 h-4" /> Thêm nội dung
                            </button>
                        </SectionCard>

                        <SectionCard icon="📖" title="IV. THỂ THỨC THI ĐẤU">
                            <Field label="Thể thức" required>
                                <RichTextEditor
                                    value={form.rules.format_content}
                                    onChange={(html) => setRules({ format_content: html })}
                                    placeholder="Các đội thi đấu vòng tròn một lượt..."
                                    minHeight={140}
                                />
                            </Field>
                        </SectionCard>

                        <SectionCard
                            icon="✅"
                            title="IV. CÁCH TÍNH ĐIỂM VÀ XÁC ĐỊNH KẾT QUẢ"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                        1. Mỗi nội dung thi đấu
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Loại set">
                                            <CustomSelect
                                                value={form.rules.scoring.set_type}
                                                onChange={(v) => setScoring({ set_type: v })}
                                                options={SET_TYPE_OPTIONS.map((opt) => ({
                                                    value: opt,
                                                    label: opt,
                                                }))}
                                            />
                                        </Field>
                                        <Field label="Điểm">
                                            <input
                                                type="number"
                                                min={1}
                                                className="input-field"
                                                value={form.rules.scoring.points_per_set}
                                                onChange={(e) =>
                                                    setScoring({ points_per_set: e.target.value })
                                                }
                                            />
                                        </Field>
                                        <Field label="Cách biệt">
                                            <input
                                                type="number"
                                                min={0}
                                                className="input-field"
                                                value={form.rules.scoring.win_margin}
                                                onChange={(e) =>
                                                    setScoring({ win_margin: e.target.value })
                                                }
                                            />
                                        </Field>
                                        <Field label="Chạm điểm tối đa">
                                            <input
                                                type="number"
                                                min={1}
                                                className="input-field"
                                                value={form.rules.scoring.max_score}
                                                onChange={(e) =>
                                                    setScoring({ max_score: e.target.value })
                                                }
                                            />
                                        </Field>
                                    </div>
                                </div>

                                <Field label="2. Việc xếp hạng các đội" required>
                                    <RichTextEditor
                                        value={form.rules.ranking_rules_content}
                                        onChange={(html) =>
                                            setRules({ ranking_rules_content: html })
                                        }
                                        placeholder="Tổng số điểm qua các nội dung thi đấu..."
                                        minHeight={180}
                                    />
                                </Field>
                            </div>
                        </SectionCard>

                        <SectionCard icon="📜" title="VI. LUẬT THI ĐẤU">
                            <Field label="Nội dung" required>
                                <RichTextEditor
                                    value={form.rules.rules_content}
                                    onChange={(html) => setRules({ rules_content: html })}
                                    placeholder="Áp dụng Luật Cầu lông hiện hành..."
                                    minHeight={140}
                                />
                            </Field>
                        </SectionCard>

                        <SectionCard icon="💰" title="LỆ PHÍ">
                            <Field label="Lệ phí / người">
                                <input
                                    type="number"
                                    min={0}
                                    className="input-field"
                                    placeholder="0"
                                    value={form.entry_fee_per_person}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            entry_fee_per_person: e.target.value,
                                        }))
                                    }
                                />
                            </Field>
                            <p className="text-xs text-gray-400 mt-1.5">
                                Áp dụng cho từng người đăng ký cá nhân (không nhân theo cặp).
                            </p>
                        </SectionCard>
                    </div>

                    <div className="space-y-6">
                        <SectionCard title="Thông tin chung" plain>
                            <Field label="Tên giải đấu" required>
                                <input
                                    className="input-field"
                                    value={form.title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                />
                            </Field>
                            <Field label="Slug (đường dẫn)" required>
                                <input
                                    className="input-field"
                                    placeholder="vd: hung-phat-bnb-cup-2026"
                                    value={form.slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                />
                            </Field>
                            <Field label="Emoji">
                                <input
                                    className="input-field"
                                    value={form.emoji}
                                    maxLength={4}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, emoji: e.target.value }))
                                    }
                                />
                            </Field>
                            <Field label="Mô tả ngắn">
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    maxLength={160}
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, description: e.target.value }))
                                    }
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">
                                    {form.description.length}/160
                                </p>
                            </Field>
                        </SectionCard>

                        <SectionCard title="Logo giải đấu" plain>
                            <ImageUploadBox
                                imageUrl={form.logo_url}
                                uploading={uploadingLogo}
                                inputRef={logoInputRef}
                                objectFit="contain"
                                onPick={(file) =>
                                    handleUploadFile(file, "logos", "logo_url", setUploadingLogo)
                                }
                            />
                        </SectionCard>

                        <SectionCard title="Ảnh bìa (Banner)" plain>
                            <ImageUploadBox
                                imageUrl={form.cover_image_url}
                                uploading={uploadingBanner}
                                inputRef={bannerInputRef}
                                objectFit="cover"
                                onPick={(file) =>
                                    handleUploadFile(
                                        file,
                                        "banners",
                                        "cover_image_url",
                                        setUploadingBanner,
                                    )
                                }
                            />
                        </SectionCard>

                        <SectionCard title="Cài đặt hiển thị" plain>
                            <Field label="Trạng thái">
                                <CustomSelect
                                    value={form.status}
                                    onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                                    options={STATUS_OPTIONS}
                                />
                            </Field>
                            <ToggleField
                                label="Hiển thị trang chủ"
                                checked={form.show_on_homepage}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, show_on_homepage: v }))
                                }
                            />
                            <Field label="Thứ tự hiển thị">
                                <input
                                    type="number"
                                    min={0}
                                    className="input-field"
                                    value={form.display_order}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, display_order: e.target.value }))
                                    }
                                />
                            </Field>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Thời gian đăng ký
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Từ ngày">
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={form.registration_start_date}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    registration_start_date: e.target.value,
                                                }))
                                            }
                                        />
                                    </Field>
                                    <Field label="Đến ngày">
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={form.registration_end_date}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    registration_end_date: e.target.value,
                                                }))
                                            }
                                        />
                                    </Field>
                                </div>
                            </div>
                            <Field label="Ngày chốt danh sách đăng ký">
                                <input
                                    type="datetime-local"
                                    className="input-field"
                                    value={form.deadline}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, deadline: e.target.value }))
                                    }
                                />
                                <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                                    Sau thời điểm này hệ thống có thể tự đóng đăng ký.
                                </p>
                            </Field>
                            <ToggleField
                                label="Hiển thị danh sách đăng ký"
                                checked={form.show_registration_list}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, show_registration_list: v }))
                                }
                            />
                        </SectionCard>

                        <SectionCard title="Ghi chú admin" plain>
                            <Field label="Ghi chú nội bộ">
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    maxLength={300}
                                    placeholder="Nhập ghi chú..."
                                    value={form.admin_notes}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, admin_notes: e.target.value }))
                                    }
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">
                                    {form.admin_notes.length}/300
                                </p>
                            </Field>
                        </SectionCard>
                    </div>
                </div>
            )}

            {activeTab !== "info" && (
                <ComingSoonTab label={TABS.find((t) => t.key === activeTab)!.label} />
            )}
        </div>
    );
}

function SectionCard({
    icon,
    title,
    children,
    plain,
}: {
    icon?: string;
    title: string;
    children: React.ReactNode;
    plain?: boolean;
}) {
    return (
        <div
            className={
                plain
                    ? "bg-white rounded-xl border border-gray-200 p-5"
                    : "bg-white rounded-xl border border-gray-200 p-5"
            }
        >
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4 tracking-wide">
                {icon && <span>{icon}</span>}
                {title}
            </h2>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

function ToggleField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative w-10 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-blue-600" : "bg-gray-300"
                    }`}
                style={{ height: "22px" }}
                aria-pressed={checked}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0"
                        }`}
                />
            </button>
        </div>
    );
}

function ImageUploadBox({
    imageUrl,
    uploading,
    inputRef,
    objectFit,
    onPick,
}: {
    imageUrl: string;
    uploading: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
    objectFit: "contain" | "cover";
    onPick: (file: File) => void;
}) {
    return (
        <div>
            <div
                className={`rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center ${objectFit === "cover" ? "h-40" : "min-h-[100px]"
                    }`}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt=""
                        className={
                            objectFit === "cover"
                                ? "w-full h-full object-cover"
                                : "w-full h-auto max-h-64 object-contain"
                        }
                    />
                ) : (
                    <span className="text-xs text-gray-400 py-10">Chưa có ảnh</span>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPick(file);
                    e.target.value = "";
                }}
            />
            <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? "Đang tải lên..." : imageUrl ? "Thay đổi" : "Tải lên"}
            </button>
        </div>
    );
}

function CompositionSlotCard({
    slot,
    onChange,
}: {
    slot: CompositionSlot;
    onChange: (key: string) => void;
}) {
    const isNu = slot.role === "nu";
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
            <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                    background: isNu
                        ? "radial-gradient(circle, #fde3ea 0%, #fdf0f4 70%)"
                        : "radial-gradient(circle, #dceafd 0%, #eef5fe 70%)",
                }}
            >
                {isNu ? <FemaleAvatar /> : <MaleAvatar />}
            </div>
            <div className="flex-1 min-w-0">
                <CustomSelect
                    value={slotOptionKey(slot.role, slot.level)}
                    onChange={onChange}
                    options={SLOT_OPTIONS.map((o) => ({
                        value: slotOptionKey(o.role, o.level),
                        label: o.label,
                    }))}
                    triggerClassName="w-full flex items-center justify-between text-left text-sm font-medium text-gray-700 bg-transparent border-none py-1 pr-0"
                />
            </div>
        </div>
    );
}

function MaleAvatar() {
    return (
        <svg viewBox="0 0 40 40" className="w-9 h-9">
            <circle cx="20" cy="20" r="20" fill="#eef5fe" />
            <path
                d="M20 38c8 0 13-3 13-3s-1-8-5-10c-1.5-.8-3-1-3-1s-2 2-5 2-5-2-5-2-1.5.2-3 1c-4 2-5 10-5 10s5 3 13 3z"
                fill="#4A90D9"
            />
            <circle cx="20" cy="15" r="7" fill="#f3c9a1" />
            <path
                d="M13 13c0-4 3-7 7-7s7 3 7 7c0-1-1-2-2-2-1.5 0-2 .8-4 .8s-2.5-.8-4-.8c-2 0-4 1-4 2z"
                fill="#3b2a20"
            />
        </svg>
    );
}

function FemaleAvatar() {
    return (
        <svg viewBox="0 0 40 40" className="w-9 h-9">
            <circle cx="20" cy="20" r="20" fill="#fdf0f4" />
            <path
                d="M20 38c8 0 13-3 13-3s-1-7-4-9.5c-2-1.7-4-2-4-2s-2 2.5-5 2.5-5-2.5-5-2.5-2 .3-4 2c-3 2.5-4 9.5-4 9.5s5 3 13 3z"
                fill="#C2185B"
            />
            <path
                d="M10 16c0-6 4.5-10 10-10s10 4 10 10c0 1.5-.3 3-.8 4.3-.6-.5-1.2-2.3-1.2-4.3 0-1-3-3.5-8-3.5s-8 2.5-8 3.5c0 2-.6 3.8-1.2 4.3-.5-1.3-.8-2.8-.8-4.3z"
                fill="#2b1810"
            />
            <circle cx="20" cy="16" r="6.5" fill="#f3c9a1" />
        </svg>
    );
}

function TwoPeopleIcon() {
    return (
        <svg viewBox="0 0 40 24" className="w-6 h-6" fill="none">
            <g>
                <circle cx="14" cy="6" r="4" fill="white" />
                <path d="M14 12c-5 0-9 2.5-9 6v3h18v-3c0-3.5-4-6-9-6z" fill="white" />
            </g>
            <g transform="translate(9,0)">
                <circle cx="14" cy="6" r="4" fill="white" />
                <path d="M14 12c-5 0-9 2.5-9 6v3h18v-3c0-3.5-4-6-9-6z" fill="white" />
            </g>
        </svg>
    );
}

function OnePersonIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
            <circle cx="12" cy="7" r="4" />
            <path d="M12 13c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z" />
        </svg>
    );
}

function ComingSoonTab({ label }: { label: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            <p className="text-sm">
                Tab <span className="font-medium text-gray-500">"{label}"</span> chưa có
                dữ liệu tương ứng ở backend (chưa có cột/field lưu trữ), nên chưa hiển
                thị nội dung ở đây để tránh mất dữ liệu khi lưu.
            </p>
        </div>
    );
}