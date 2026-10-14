import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, MapPin, Store, Users, Package, CalendarDays,
  CheckCircle2, Clock, Search, X, Loader2, Plus, Share2,
  SlidersHorizontal, Sparkles, ArrowRight, AlertCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { marketService } from "../services/market";
import { advertisementService } from "../services/advertisement";
import { getFullImageUrl } from "../lib/image";
import { useAuthStore } from "../store/auth";

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
const fmtPrice = (n) => Number(n || 0).toLocaleString("en-US");

const parseDays = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return raw
        .replace(/[\[\]"]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseImages = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [p];
    } catch {
      return [raw];
    }
  }
  return [];
};

const initials = (name) =>
  name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const SORT_OPTIONS = [
  { key: "default", label: "Recommended" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "name", label: "Name A–Z" },
];

const PRODUCTS_BEFORE_ADS = 6;

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
export default function MarketDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();

  const [market, setMarket] = useState(null);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [activeCat, setActiveCat] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const isTrader = user?.role === "trader";

  /* ═══ Fetch market + ads ═══ */
  const fetchMarket = async () => {
    try {
      const res = await marketService.getMarketById(id);
      setMarket(res);
      return res;
    } catch (e) {
      console.error("Failed to load market:", e);
      toast.error("Could not load market");
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchMarket(),
        advertisementService
          .getActiveAds()
          .then((a) => setAds(a || []))
          .catch(() => []),
      ]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ═══ Derived data ═══ */
  const memberships = useMemo(() => market?.MarketMemberships || [], [market]);

  const allProducts = useMemo(() => {
    const list = [];
    memberships.forEach((m) => {
      const trader = m.User || m.trader;
      if (trader?.Products) {
        trader.Products.forEach((p) =>
          list.push({
            ...p,
            trader_id: trader.id,
            trader_name: trader.full_name || trader.username || "Trader",
            trader_image: trader.profile_image,
            trader_shop: trader.TraderProfile?.shop_name,
          })
        );
      }
    });
    return list;
  }, [memberships]);

  const categories = useMemo(() => {
    const map = {};
    allProducts.forEach((p) => {
      if (p.Category?.name) {
        map[p.Category.name] = (map[p.Category.name] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProducts]);

  const filtered = useMemo(() => {
    let list = [...allProducts];

    if (activeCat) {
      list = list.filter((p) => p.Category?.name === activeCat);
    }

    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      list = list.filter((p) =>
        [p.name, p.description, p.Category?.name, p.trader_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      );
    }

    if (sortBy === "price_asc")
      list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price_desc")
      list.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "name")
      list.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );

    return list;
  }, [allProducts, activeCat, query, sortBy]);

  const isMember = useMemo(
    () =>
      isTrader &&
      memberships.some(
        (m) => (m.User?.id || m.trader_id) === user?.id && m.is_active !== false
      ),
    [isTrader, memberships, user]
  );

  const filtersActive =
    sortBy !== "default" || !!activeCat || query.trim().length > 0;

  /* ═══ Actions ═══ */
  const handleJoin = async () => {
    if (!user) {
      toast.error("Please sign in first");
      nav("/auth/login");
      return;
    }
    if (!isTrader) {
      toast.error("Only traders can join markets");
      return;
    }
    setJoining(true);
    try {
      await marketService.joinMarket(id);
      toast.success("Joined market!");
      await fetchMarket();
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Could not join market";

      console.error("❌ Join market failed:", {
        status,
        message: msg,
        data: e?.response?.data,
      });

      if (status === 401) {
        toast.error("Session expired. Please sign in again.");
        nav("/auth/login");
      } else if (status === 403) {
        toast.error("Only traders can join markets");
      } else if (status === 404) {
        toast.error("Market not found");
      } else if (status === 409) {
        toast.error("You're already a member of this market");
      } else {
        toast.error(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = market?.name || "Market";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not share");
    }
  };

  const resetFilters = () => {
    setSortBy("default");
    setActiveCat(null);
    setQuery("");
  };

  /* ═══ Loading ═══ */
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container-app flex flex-col items-center py-24 text-center">
        <Store size={44} className="text-ink-300" />
        <p className="mt-4 text-lg font-black text-ink-900">Market not found</p>
        <Link
          to="/markets"
          className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-extrabold text-white hover:bg-brand-700"
        >
          Back to markets
        </Link>
      </div>
    );
  }

  const logo = getFullImageUrl(market.logo_image);
  const banner = getFullImageUrl(market.banner_image);
  const days = parseDays(market.days_active);
  const isActive = market.is_active !== false;
  const location = [market.district, market.sector].filter(Boolean).join(", ");

  return (
    <div className="bg-surface dark:bg-ink-950">
      {/* ═══════════════ Banner ═══════════════ */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-navy-600 sm:h-64">
        {banner && (
          <img
            src={banner}
            alt={market.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Back */}
        <button
          onClick={() => nav(-1)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <Share2 size={16} />
        </button>

        {/* Active badge */}
        <span
          className={
            "absolute right-16 top-4 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow backdrop-blur " +
            (isActive ? "bg-emerald-500/90" : "bg-ink-500/80")
          }
        >
          {isActive ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {isActive ? "Active" : "Inactive"}
        </span>

        {/* Identity on banner */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl sm:h-24 sm:w-24">
              {logo ? (
                <img
                  src={logo}
                  alt={market.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-600 text-2xl font-black text-white">
                  {market.name?.charAt(0)?.toUpperCase() || "M"}
                </div>
              )}
            </div>

            <div className="min-w-0 pb-1">
              <h1 className="line-clamp-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {market.name}
              </h1>
              {location && (
                <p className="mt-1 flex items-center gap-1 text-[13px] text-white/90">
                  <MapPin size={12} />
                  {location}
                  {market.cell ? ` · ${market.cell}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ Stats strip ═══════════════ */}
      <div className="border-b border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="container-app grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
          <StatBox icon={Users} label="Traders" value={memberships.length} />
          <StatBox icon={Store} label="Businesses" value={categories.length} />
          <StatBox icon={CalendarDays} label="Open days" value={days.length} />
          <StatBox icon={Package} label="Products" value={allProducts.length} />
        </div>
      </div>

      {/* ═══════════════ Main grid ═══════════════ */}
      <div className="container-app grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        {/* ─── LEFT ─── */}
        <div className="min-w-0 space-y-6">
          {/* About */}
          {market.description && (
            <Section title="About this market">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700 dark:text-ink-300">
                {market.description}
              </p>
            </Section>
          )}

          {/* Open days */}
          {days.length > 0 && (
            <Section title="Open days">
              <div className="flex flex-wrap gap-2">
                {days.map((d) => (
                  <span
                    key={d}
                    className="rounded-full border border-brand-600/30 bg-brand-50 px-3 py-1.5 text-[12px] font-extrabold text-brand-700 dark:bg-brand-600/10 dark:text-brand-400"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Products */}
          <Section
            title="Products"
            action={
              <span className="text-[12px] font-semibold text-ink-500 dark:text-ink-400">
                {filtered.length}{" "}
                {filtered.length === 1 ? "item" : "items"}
              </span>
            }
          >
            {/* Search + filter bar */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-ink-200 bg-white px-4 dark:border-ink-800 dark:bg-ink-900">
                <Search size={15} className="text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products in this market…"
                  className="h-full flex-1 bg-transparent text-[13.5px] font-medium text-ink-900 outline-none placeholder:text-ink-400 dark:text-ink-100"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-ink-400 hover:text-ink-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters((v) => !v)}
                className={
                  "flex h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-[12.5px] font-extrabold transition-colors " +
                  (showFilters || filtersActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-brand-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200")
                }
              >
                <SlidersHorizontal size={14} />
                Filter
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mb-4 rounded-2xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-800 dark:bg-ink-800/50">
                <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                  Sort by
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={
                        "rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors " +
                        (sortBy === s.key
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-brand-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300")
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {filtersActive && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-brand-600 hover:text-brand-700"
                  >
                    <RefreshCw size={12} />
                    Reset filters
                  </button>
                )}
              </div>
            )}

            {/* Category chips */}
            {categories.length > 0 && (
              <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCat(null)}
                  className={
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors " +
                    (!activeCat
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-200 bg-white text-ink-700 hover:border-brand-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300")
                  }
                >
                  All ({allProducts.length})
                </button>
                {categories.map((c) => {
                  const active = activeCat === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setActiveCat(active ? null : c.name)}
                      className={
                        "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors " +
                        (active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-brand-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300")
                      }
                    >
                      {c.name} ({c.count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 py-14 text-center dark:border-ink-800">
                <Package size={38} className="mx-auto text-ink-300" />
                <p className="mt-3 text-[14px] font-black text-ink-900 dark:text-ink-100">
                  No products found
                </p>
                <p className="mt-1 text-[12.5px] text-ink-500 dark:text-ink-400">
                  {allProducts.length === 0
                    ? "Traders haven't listed any products here yet."
                    : "Try a different search or clear the filters."}
                </p>
                {filtersActive && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12.5px] font-extrabold text-white hover:bg-brand-700"
                  >
                    <RefreshCw size={12} />
                    Show all products
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filtered.slice(0, PRODUCTS_BEFORE_ADS).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* Inline ad section */}
                {ads.length > 0 && filtered.length > PRODUCTS_BEFORE_ADS && (
                  <div className="my-6 rounded-2xl border border-ink-200/70 bg-ink-50 p-4 dark:border-ink-800 dark:bg-ink-800/40">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-brand-600" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-700 dark:text-ink-300">
                          Sponsored
                        </span>
                      </div>
                      <span className="text-[10.5px] font-semibold text-ink-400">
                        {ads.length} offers
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {ads.slice(0, 3).map((ad) => (
                        <AdCard key={ad.id} ad={ad} />
                      ))}
                    </div>
                  </div>
                )}

                {filtered.length > PRODUCTS_BEFORE_ADS && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filtered.slice(PRODUCTS_BEFORE_ADS).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </>
            )}
          </Section>
        </div>

        {/* ─── RIGHT sidebar ─── */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Join card (traders only) */}
          {isTrader && (
            <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
              <h3 className="text-[14.5px] font-black text-ink-900 dark:text-ink-100">
                {isMember ? "You're a member" : "Join this market"}
              </h3>
              <p className="mt-1.5 text-[12.5px] text-ink-500 dark:text-ink-400">
                {isMember
                  ? "Your shop is visible to customers browsing this market."
                  : "Add your shop here to reach more customers in this area."}
              </p>

              <button
                onClick={handleJoin}
                disabled={joining || isMember}
                className={
                  "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-extrabold text-white shadow-md transition-all disabled:opacity-70 " +
                  (isMember
                    ? "bg-emerald-500"
                    : "bg-brand-600 shadow-brand hover:bg-brand-700")
                }
              >
                {joining ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isMember ? (
                  <>
                    <CheckCircle2 size={16} />
                    Joined
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Join market
                  </>
                )}
              </button>
            </div>
          )}

          {/* Non-trader notice */}
          {user && !isTrader && (
            <div className="flex items-start gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-brand-600"
              />
              <p className="text-[12.5px] leading-relaxed text-ink-600 dark:text-ink-300">
                Only <span className="font-bold">trader</span> accounts can join
                markets. Sign in with a trader account to add your shop here.
              </p>
            </div>
          )}

          {/* Guest notice */}
          {!user && (
            <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
              <p className="text-[13px] text-ink-700 dark:text-ink-300">
                Sign in to join markets and manage your shop.
              </p>
              <Link
                to="/auth/login"
                className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-full bg-brand-600 text-[13px] font-extrabold text-white hover:bg-brand-700"
              >
                Sign in
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Traders list */}
          {memberships.length > 0 && (
            <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14.5px] font-black text-ink-900 dark:text-ink-100">
                  Traders ({memberships.length})
                </h3>
              </div>

              <div className="space-y-1">
                {memberships.slice(0, 10).map((m) => {
                  const trader = m.User || m.trader;
                  if (!trader) return null;
                  const avatar = getFullImageUrl(trader.profile_image);
                  const shop =
                    trader.TraderProfile?.shop_name ||
                    trader.full_name ||
                    "Trader";
                  const isActiveTrader = m.is_active !== false;

                  return (
                    <Link
                      key={m.id}
                      to={`/traders/${trader.id}`}
                      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800"
                    >
                      <div className="relative">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-600">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={shop}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[12px] font-black text-white">
                              {initials(trader.full_name || shop)}
                            </div>
                          )}
                        </div>
                        <span
                          className={
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-ink-900 " +
                            (isActiveTrader ? "bg-emerald-500" : "bg-ink-300")
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-ink-900 dark:text-ink-100">
                          {shop}
                        </p>
                        {trader.TraderProfile?.business_category && (
                          <p className="truncate text-[11px] text-ink-500 dark:text-ink-400">
                            {trader.TraderProfile.business_category}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {memberships.length > 10 && (
                <Link
                  to={`/markets/${id}/traders`}
                  className="mt-3 flex items-center justify-center gap-1 text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
                >
                  View all {memberships.length} traders
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

function Section({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black tracking-tight text-ink-900 dark:text-ink-100">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatBox({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-200/70 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-[17px] font-black leading-none text-ink-900 dark:text-ink-100">
          {value}
        </p>
        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {label}
        </p>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const img = getFullImageUrl(parseImages(product.images)[0]);
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-md dark:border-ink-800 dark:bg-ink-900"
    >
      <div className="aspect-square w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <Store size={26} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[34px] text-[12.5px] font-bold leading-tight text-ink-900 dark:text-ink-100">
          {product.name}
        </p>
        {product.description && (
          <p className="mt-1 line-clamp-2 min-h-[26px] text-[11px] text-ink-500 dark:text-ink-400">
            {product.description}
          </p>
        )}
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[14px] font-black text-brand-600 tabular-nums">
            {fmtPrice(product.price)}
          </span>
          <span className="text-[9.5px] font-bold text-brand-600/80">RWF</span>
        </div>
        <p className="mt-1.5 line-clamp-1 text-[10.5px] font-semibold text-ink-500 dark:text-ink-400">
          {product.trader_shop || product.trader_name}
        </p>
      </div>
    </Link>
  );
}

function AdCard({ ad }) {
  const img = getFullImageUrl(ad.image_url);
  return (
    <a
      href={ad.link_url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-[150px] overflow-hidden rounded-xl bg-ink-900 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {img ? (
        <img
          src={img}
          alt={ad.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-brand-600 to-navy-600" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
      <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
        Ad
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-2 text-[13px] font-black leading-tight text-white">
          {ad.title}
        </p>
        {ad.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/85">
            {ad.subtitle}
          </p>
        )}
      </div>
    </a>
  );
}