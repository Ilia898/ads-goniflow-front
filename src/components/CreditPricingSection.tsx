"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useCreditStore } from "../store/creditStore";
import { apiFetch } from "../utils/api";

export default function CreditPricingSection() {
    const { isAuthenticated } = useAuthStore();
    const { catalog, fetchCatalog } = useCreditStore();
    const [flexQuantity, setFlexQuantity] = useState(1);
    const [valueQuantity, setValueQuantity] = useState(1);
    const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);

    useEffect(() => {
        void fetchCatalog();
    }, [fetchCatalog]);

    const flexProduct = catalog?.products.find((item) => item.id === "flex-20");
    const valueProduct = catalog?.products.find((item) => item.id === "value-240");

    const flexPrice = flexProduct?.priceGel ?? 2;
    const flexCredits = flexProduct?.credits ?? 20;
    const valuePrice = valueProduct?.priceGel ?? 20;
    const valueCredits = valueProduct?.credits ?? 240;
    const monthlyPromo = catalog?.monthlyPromoCredits ?? 9;
    const paymentEnabled = catalog?.payment.enabled ?? false;
    const paymentEnabledLabel = "ბარათით გადახდა";
    const paymentNotEnabledLabel = "გადახდის მონაცემები ჯერ არ არის დამატებული";

    const handlePurchase = async (productId: string, quantity: number) => {
        setPurchasingProduct(productId);
        setPurchaseError(null);
        try {
            const response = await apiFetch("/payments/checkout", {
                method: "POST",
                headers: { "Idempotency-Key": crypto.randomUUID() },
                body: JSON.stringify({ productId, quantity }),
            });
            const checkoutUrl = response.data?.checkoutUrl;
            if (typeof checkoutUrl !== "string" || !checkoutUrl) {
                throw new Error("გადახდის ბმული ვერ შეიქმნა.");
            }
            window.location.assign(checkoutUrl);
        } catch (error) {
            setPurchaseError((error as Error).message);
            setPurchasingProduct(null);
        }
    };

    const purchaseButton = (
        label: string,
        productId: string,
        quantity: number,
    ) => (
        isAuthenticated ? (
            <button
                type="button"
                disabled={!paymentEnabled || purchasingProduct !== null}
                onClick={() => void handlePurchase(productId, quantity)}
                className="mt-7 w-full rounded-xl border border-indigo-500/30 bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500"
                title={paymentEnabled ? paymentEnabledLabel : paymentNotEnabledLabel}
            >
                {purchasingProduct === productId
                    ? "გადახდა მზადდება…"
                    : paymentEnabled
                        ? label
                        : `${label} — გადახდა მალე`}
            </button>
        ) : (
            <Link
                href="/register"
                className="mt-7 block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-xs font-bold text-white transition-colors hover:bg-indigo-500"
            >
                რეგისტრაცია და დაწყება
            </Link>
        )
    );

    return (
        <section
            id="pricing"
            className="scroll-mt-16 border-t border-slate-900 bg-slate-950/40 py-16"
        >
            <div className="mx-auto max-w-6xl px-4">
                <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                        კრედიტები
                    </span>
                    <h2 className="text-2xl font-extrabold sm:text-4xl">
                        გადაიხადე მხოლოდ გამოყენებისას
                    </h2>
                    <p className="text-xs text-slate-400 sm:text-sm">
                        გამოწერის გარეშე — შეავსე ბალანსი სასურველი რაოდენობით.
                        შეძენილი კრედიტები არ იწურება.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <article className="glass-panel flex flex-col justify-between rounded-3xl border-slate-900 p-7">
                        <div>
                            <h3 className="text-lg font-bold text-slate-100">უფასო</h3>
                            <p className="mt-1 text-xs text-slate-500">პროდუქტის გამოსაცდელად</p>
                            <p className="mt-6 text-4xl font-black text-white">0 ₾</p>
                            <ul className="mt-6 space-y-3 border-t border-slate-900 pt-5 text-xs text-slate-400">
                                <li>✓ {monthlyPromo} ბონუს-კრედიტი ყოველ თვე</li>
                                <li>✓ 3 სრული სტანდარტული პოსტი</li>
                                <li>✓ 1 აქტიური პროექტი</li>
                                <li>✓ კრედიტები ყოველ თვე ახლდება</li>
                            </ul>
                        </div>
                        <Link
                            href={isAuthenticated ? "/profile/generator" : "/register"}
                            className="mt-7 block w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-center text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800"
                        >
                            უფასოდ დაწყება
                        </Link>
                    </article>

                    <article className="glass-panel flex flex-col justify-between rounded-3xl border-indigo-500/30 p-7 shadow-xl shadow-indigo-500/5">
                        <div>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white">მოქნილი შევსება</h3>
                                    <p className="mt-1 text-xs text-slate-500">იშვიათი გამოყენებისთვის</p>
                                </div>
                                <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[9px] font-bold text-indigo-300">
                                    2 ₾-დან
                                </span>
                            </div>
                            <p className="mt-6 text-4xl font-black text-white">
                                {flexPrice * flexQuantity} ₾
                            </p>
                            <p className="mt-2 text-sm font-bold text-indigo-300">
                                {flexCredits * flexQuantity} კრედიტი
                            </p>
                            <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                რაოდენობა
                                <select
                                    value={flexQuantity}
                                    onChange={(event) => setFlexQuantity(Number(event.target.value))}
                                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                                >
                                    {[1, 2, 3, 4, 5, 10].map((quantity) => (
                                        <option key={quantity} value={quantity}>
                                            {quantity} × {flexPrice} ₾
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <p className="mt-5 border-t border-slate-900 pt-5 text-xs text-slate-400">
                                დაახლოებით {Math.floor((flexCredits * flexQuantity) / 3)} სტანდარტული
                                ან {Math.floor((flexCredits * flexQuantity) / 6)} პრემიუმ პოსტი.
                            </p>
                        </div>
                        {purchaseButton("კრედიტების შეძენა", "flex-20", flexQuantity)}
                    </article>

                    <article className="glass-panel relative flex flex-col justify-between rounded-3xl border-purple-500/30 p-7">
                        <span className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                            საუკეთესო ფასი
                        </span>
                        <div>
                            <h3 className="text-lg font-bold text-white">დიდი შევსება</h3>
                            <p className="mt-1 text-xs text-slate-500">აქტიური ბიზნესებისთვის</p>
                            <p className="mt-6 text-4xl font-black text-white">
                                {valuePrice * valueQuantity} ₾
                            </p>
                            <p className="mt-2 text-sm font-bold text-purple-300">
                                {valueCredits * valueQuantity} კრედიტი
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-emerald-400">
                                20% ბონუსი ჩათვლილია
                            </p>
                            <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                რაოდენობა
                                <select
                                    value={valueQuantity}
                                    onChange={(event) => setValueQuantity(Number(event.target.value))}
                                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                                >
                                    {[1, 2, 3, 5, 10].map((quantity) => (
                                        <option key={quantity} value={quantity}>
                                            {quantity} × {valuePrice} ₾
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <p className="mt-5 border-t border-slate-900 pt-5 text-xs text-slate-400">
                                დაახლოებით {Math.floor((valueCredits * valueQuantity) / 3)} სტანდარტული
                                ან {Math.floor((valueCredits * valueQuantity) / 6)} პრემიუმ პოსტი.
                            </p>
                        </div>
                        {purchaseButton("მომგებიანი შევსება", "value-240", valueQuantity)}
                    </article>
                </div>
                {purchaseError && (
                    <p className="mt-5 text-center text-xs font-semibold text-rose-400">
                        {purchaseError}
                    </p>
                )}
            </div>
        </section>
    );
}
