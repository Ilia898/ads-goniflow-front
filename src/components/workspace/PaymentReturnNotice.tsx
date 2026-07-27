"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useCreditStore } from "../../store/creditStore";

type NoticeStatus = "hidden" | "checking" | "paid" | "failed" | "pending";

interface PurchaseSummary {
    id: string;
    status: "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
    credits: number;
}

export default function PaymentReturnNotice() {
    const [status, setStatus] = useState<NoticeStatus>("hidden");
    const [creditedAmount, setCreditedAmount] = useState(0);
    const { fetchBalance } = useCreditStore();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const purchaseId = params.get("purchase");
        const paymentResult = params.get("payment");
        if (
            !purchaseId
            || !["success", "fail", "return"].includes(paymentResult || "")
        ) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let attempts = 0;

        const checkPurchase = async () => {
            if (cancelled) return;
            setStatus("checking");

            try {
                const response = await apiFetch("/credits/purchases?limit=25");
                const purchases = response.data as PurchaseSummary[];
                const purchase = purchases.find((item) => item.id === purchaseId);

                if (purchase?.status === "paid") {
                    setCreditedAmount(purchase.credits);
                    setStatus("paid");
                    await fetchBalance();
                    return;
                }

                if (
                    purchase?.status === "failed"
                    || purchase?.status === "cancelled"
                    || purchase?.status === "refunded"
                ) {
                    setStatus("failed");
                    return;
                }

                attempts += 1;
                if (attempts < 6) {
                    timer = setTimeout(checkPurchase, 2000);
                } else {
                    setStatus("pending");
                }
            } catch {
                attempts += 1;
                if (attempts < 4) {
                    timer = setTimeout(checkPurchase, 2000);
                } else {
                    setStatus("pending");
                }
            }
        };

        timer = setTimeout(checkPurchase, 0);
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [fetchBalance]);

    if (status === "hidden") return null;

    const styles = status === "paid"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : status === "failed"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300";

    const message = status === "paid"
        ? `გადახდა წარმატებულია — ბალანსზე დაემატა ${creditedAmount} კრედიტი.`
        : status === "failed"
            ? "გადახდა ვერ დასრულდა. კრედიტები არ დამატებულა."
            : status === "pending"
                ? "გადახდა ჯერ მოწმდება. ბალანსი ავტომატურად განახლდება დადასტურების შემდეგ."
                : "გადახდის სტატუსი მოწმდება…";

    return (
        <div className={`lg:col-span-2 rounded-xl border px-4 py-3 text-xs font-semibold ${styles}`}>
            {message}
        </div>
    );
}
