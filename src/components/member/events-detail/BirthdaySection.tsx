"use client";

import { format } from "date-fns";

export function BirthdaySection({ myStatus }: any) {
    const members = myStatus?.members ?? [];
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900">Thành viên có sinh nhật</h3>
            {members.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Không có ai trong danh sách</p>
            ) : (
                <div className="grid grid-cols-4 gap-3">
                    {members.map((m: any) => (
                        <div key={m.id} className="flex flex-col items-center gap-1.5">
                            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center font-bold text-pink-600 overflow-hidden">
                                {m.avatar_url ? (
                                    <img src={m.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    m.full_name?.[0]
                                )}
                            </div>
                            <p className="text-xs text-center text-gray-600 truncate w-full">{m.full_name}</p>
                            <p className="text-[10px] text-gray-400">
                                {format(new Date(m.date_of_birth), "dd/MM")}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
