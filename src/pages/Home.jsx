import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, Store, Trophy, Flame, Sparkles, ShoppingBag,
  ArrowRight, Megaphone, LayoutGrid,
} from "lucide-react";
import { categoryService } from "../services/category";
import { productService } from "../services/product";
import { traderService } from "../services/trader";
import { marketService } from "../services/market";
import { advertisementService } from "../services/advertisement";
import { userService } from "../services/user";
import { getFullImageUrl } from "../lib/image";
import ProductCard from "../components/shared/ProductCard";
import BusinessCategories from "../components/shared/BusinessCategories";
import { useAuthStore } from "../store/auth";

const HERO_ROTATE_MS = 5000;
const MOBILE_AD_ROTATE_MS = 4000;
const PRODUCT_CHUNK = 12;
const MOBILE_AD_EVERY = 5;

/* ═══════════════════════════════════════════════════════
   Hook: isMobile (matches Tailwind's lg breakpoint = 1024px)
   ═══════════════════════════════════════════════════════ */
function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export default function Home() {
  const { user, setUser } = useAuthStore();
  const isMobile = useIsMobile();

  const [ads, setAds] = useState([]);
  const [bizCats, setBizCats] = useState([]);
  const [traders, setTraders] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ═══ Fetch everything + refresh user profile ═══ */
  useEffect(() => {
    (async () => {
      const [a, b, t, m, c] = await Promise.all([
        advertisementService.getActiveAds().catch(() => []),
        traderService.getBusinessCategories().catch(() => []),
        traderService.getTraders().catch(() => []),
        marketService.getMarkets().catch(() => []),
        categoryService.getCategories().catch(() => []),
      ]);
      setAds(a || []);
      setBizCats(b || []);
      setMarkets(m || []);
      setCategories(c || []);
      setTraders(
        [...(t || [])].sort(
          (x, y) =>
            (parseFloat(y?.TraderProfile?.rating_avg) || 0) -
            (parseFloat(x?.TraderProfile?.rating_avg) || 0)
        )
      );
    })();

    if (user) {
      userService
        .getProfile()
        .then((fresh) => {
          if (fresh && setUser) {
            localStorage.setItem("user", JSON.stringify(fresh));
            setUser(fresh, localStorage.getItem("token"));
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ═══ Fetch products ═══ */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const params = { limit: 40, offset: 0 };
      if (selectedCat) params.category = selectedCat;
      try {
        const res = await productService.getProducts(params);
        setProducts(res.products || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCat]);

  const productsBeforeAds = useMemo(
    () => products.slice(0, PRODUCT_CHUNK),
    [products]
  );
  const productsAfterAds = useMemo(
    () => products.slice(PRODUCT_CHUNK),
    [products]
  );

  const topAds = useMemo(() => ads.slice(0, 3), [ads]);
  const midAds = useMemo(() => ads.slice(3, 9), [ads]);

  return (
    <div className="space-y-10 pb-10">
      {/* ═══════════════════════════════════════════════════════
          TOP SECTION
          - Desktop: sidebar + ads grid (unchanged)
          - Mobile: products first → ads carousel → products with
            inline ad every 5 products
      ═══════════════════════════════════════════════════════ */}
      <section className="container-app pt-6">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* ── LEFT: Category sidebar (desktop only) ── */}
          <aside className="hidden rounded-2xl border border-ink-200/70 bg-white p-2 shadow-sm lg:block dark:border-ink-800 dark:bg-ink-900">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-3 dark:border-ink-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/10">
                <LayoutGrid size={14} />
              </span>
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-ink-700 dark:text-ink-200">
                All Categories
              </span>
            </div>

            {/* List */}
            <ul className="mt-1 max-h-[420px] overflow-y-auto scrollbar-none">
              {categories.slice(0, 14).map((c) => {
                const isActive = selectedCat === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedCat(isActive ? null : c.id)}
                      className={
                        "group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors " +
                        (isActive
                          ? "bg-brand-50 text-brand-600 dark:bg-brand-600/10"
                          : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800")
                      }
                    >
                      <span className="flex items-center gap-2 truncate text-[13px] font-bold">
                        <span
                          className={
                            "h-1.5 w-1.5 shrink-0 rounded-full " +
                            (isActive ? "bg-brand-600" : "bg-ink-300 dark:bg-ink-600")
                          }
                        />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <ChevronRight
                        size={13}
                        className={
                          "shrink-0 transition-transform group-hover:translate-x-0.5 " +
                          (isActive ? "text-brand-600" : "text-ink-300")
                        }
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Footer link */}
            <div className="mt-1 border-t border-ink-100 px-3 pt-3 dark:border-ink-800">
              <button
                onClick={() => setSelectedCat(null)}
                className={
                  "w-full rounded-xl px-3 py-2.5 text-left text-[12.5px] font-extrabold transition-colors " +
                  (selectedCat === null
                    ? "bg-brand-600 text-white"
                    : "text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-600/10")
                }
              >
                {selectedCat === null
                  ? "Showing all products ✓"
                  : "Show all products →"}
              </button>
            </div>
          </aside>

          {/* ── RIGHT: Ads (hero + 2 mini) — desktop only ── */}
          <div className="hidden min-w-0 lg:block">
            {topAds.length > 0 ? (
              <AdSection ads={topAds} />
            ) : (
              <div className="h-48 rounded-2xl bg-gradient-to-br from-brand-600 to-navy-600 sm:h-72" />
            )}

            {/* Mobile category strip — hidden now that we render mobile below */}
            {categories.length > 0 && (
              <div className="scrollbar-none mt-3 hidden gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCat(null)}
                  className={
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors " +
                    (selectedCat === null
                      ? "bg-brand-600 text-white"
                      : "bg-white text-ink-600 border border-ink-200 dark:bg-ink-900 dark:border-ink-800 dark:text-ink-300")
                  }
                >
                  All
                </button>
                {categories.slice(0, 10).map((c) => {
                  const isActive = selectedCat === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCat(isActive ? null : c.id)}
                      className={
                        "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors " +
                        (isActive
                          ? "bg-brand-600 text-white"
                          : "bg-white text-ink-600 border border-ink-200 dark:bg-ink-900 dark:border-ink-800 dark:text-ink-300")
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ MOBILE: category strip ═══ */}
        {categories.length > 0 && (
          <div className="scrollbar-none mt-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <button
              onClick={() => setSelectedCat(null)}
              className={
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors " +
                (selectedCat === null
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink-600 border border-ink-200 dark:bg-ink-900 dark:border-ink-800 dark:text-ink-300")
              }
            >
              All
            </button>
            {categories.slice(0, 10).map((c) => {
              const isActive = selectedCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(isActive ? null : c.id)}
                  className={
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors " +
                    (isActive
                      ? "bg-brand-600 text-white"
                      : "bg-white text-ink-600 border border-ink-200 dark:bg-ink-900 dark:border-ink-800 dark:text-ink-300")
                  }
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ BUSINESS CATEGORIES (icons row) ═══ */}
      {bizCats.length > 0 && (
        <section className="container-app">
          <BusinessCategories categories={bizCats} />
        </section>
      )}

      {/* ═══ TOP TRADERS ═══ */}
      {traders.length > 0 && (
        <section className="container-app">
          <SectionHeader
            icon={<Trophy size={16} className="text-amber-500" />}
            title="Top rated traders"
            subtitle="Trusted by the community"
            to="/traders"
          />
          <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {traders.slice(0, 12).map((t) => (
              <TraderCircle key={t.id} trader={t} />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRODUCTS + ADS
          Desktop: first 12 → mid ads grid → rest
          Mobile:  products first (with inline ad every 5) →
                   single auto-scroll ad carousel → rest
      ═══════════════════════════════════════════════════════ */}

      {/* ── DESKTOP product flow (hidden on mobile) ── */}
      <div className="hidden space-y-10 lg:block">
        {/* First 12 products */}
        <section className="container-app">
          <SectionHeader
            icon={<Flame size={16} className="text-brand-600" />}
            title={
              selectedCat
                ? categories.find((c) => c.id === selectedCat)?.name ||
                  "Recommended for you"
                : "Recommended for you"
            }
            subtitle={
              user
                ? `Fresh picks for ${user.full_name?.split(" ")[0] || "you"}`
                : "Fresh picks from your favourite traders"
            }
            to="/search"
          />

          {loading ? (
            <ProductSkeletonGrid count={10} />
          ) : productsBeforeAds.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-400">
              No products yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {productsBeforeAds.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Mid ads grid */}
        {midAds.length > 0 && (
          <section className="container-app">
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={16} className="text-brand-600" />
              <h2 className="text-[17px] font-black tracking-tight">
                Sponsored picks
              </h2>
            </div>
            <AdSection ads={midAds} />
          </section>
        )}

        {/* Products after */}
        {productsAfterAds.length > 0 && (
          <section className="container-app">
            <SectionHeader
              icon={<ShoppingBag size={16} className="text-brand-600" />}
              title="More products"
              subtitle="Keep exploring"
              to="/search"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {productsAfterAds.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── MOBILE product flow (hidden on desktop) ── */}
      <div className="space-y-10 lg:hidden">
        {/* Products first — inline ad every MOBILE_AD_EVERY products */}
        <section className="container-app">
          <SectionHeader
            icon={<Flame size={16} className="text-brand-600" />}
            title={
              selectedCat
                ? categories.find((c) => c.id === selectedCat)?.name ||
                  "Recommended for you"
                : "Recommended for you"
            }
            subtitle={
              user
                ? `Fresh picks for ${user.full_name?.split(" ")[0] || "you"}`
                : "Fresh picks from your favourite traders"
            }
            to="/search"
          />

          {loading ? (
            <ProductSkeletonGrid count={10} />
          ) : productsBeforeAds.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-400">
              No products yet.
            </p>
          ) : (
            <>
              <MobileProductGrid
                products={productsBeforeAds}
                ads={ads}
                startIndex={0}
              />

              {/* Single auto-scrolling ad carousel */}
              {ads.length > 0 && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Megaphone size={15} className="text-brand-600" />
                    <h2 className="text-[15px] font-black tracking-tight">
                      Sponsored
                    </h2>
                  </div>
                  <MobileAdCarousel ads={ads} />
                </div>
              )}

              {/* Remaining products with inline ads */}
              {productsAfterAds.length > 0 && (
                <div className="mt-6">
                  <MobileProductGrid
                    products={productsAfterAds}
                    ads={ads}
                    startIndex={productsBeforeAds.length}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ═══ MARKETS ═══ */}
      {markets.length > 0 && (
        <section className="border-y border-ink-200/70 bg-white py-8 dark:border-ink-800 dark:bg-ink-900">
          <div className="container-app">
            <SectionHeader
              icon={<Sparkles size={16} className="text-brand-600" />}
              title="Markets near you"
              subtitle="Discover local markets"
              to="/markets"
            />
            <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
              {markets.slice(0, 12).map((m) => (
                <MarketCircle key={m.id} market={m} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MOBILE: product grid with inline ads after every N items
   ═══════════════════════════════════════════════════════ */
function MobileProductGrid({ products, ads, startIndex = 0 }) {
  if (!products.length) return null;

  const items = [];
  products.forEach((p, i) => {
    items.push(
      <ProductCard key={`p-${p.id}`} product={p} />
    );

    const isLast = i === products.length - 1;
    const shouldInsertAd =
      !isLast &&
      (startIndex + i + 1) % MOBILE_AD_EVERY === 0 &&
      ads.length > 0;

    if (shouldInsertAd) {
      const ad = ads[(startIndex + i) % ads.length];
      items.push(
        <div key={`ad-${startIndex + i}`} className="col-span-2">
          <MobileInlineAd ad={ad} />
        </div>
      );
    }
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      {items}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MOBILE: single auto-scrolling ad carousel
   ═══════════════════════════════════════════════════════ */
function MobileAdCarousel({ ads }) {
  const list = useMemo(() => ads.slice(0, 8), [ads]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (list.length < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % list.length);
    }, MOBILE_AD_ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [list.length]);

  if (!list.length) return null;

  const go = (dir) => {
    setIdx((i) => (i + dir + list.length) % list.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    if (list.length > 1) {
      timerRef.current = setInterval(() => {
        setIdx((i) => (i + 1) % list.length);
      }, MOBILE_AD_ROTATE_MS);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {list.map((ad) => (
          <div key={ad.id} className="w-full shrink-0">
            <MobileHeroAd ad={ad} />
          </div>
        ))}
      </div>

      {/* Dots */}
      {list.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to ad ${i + 1}`}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileHeroAd({ ad }) {
  const img = getFullImageUrl(ad.image_url);
  return (
    <a
      href={ad.link_url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-[200px] w-full overflow-hidden rounded-2xl bg-ink-900 text-white shadow-lg"
    >
      <div className="absolute inset-0">
        {img ? (
          <img
            src={img}
            alt={ad.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-600 to-navy-600" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <span className="inline-block w-fit rounded-full bg-white/20 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
          Sponsored
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-[16px] font-black leading-tight text-white">
          {ad.title}
        </h3>
        {ad.subtitle && (
          <p className="mt-1 line-clamp-1 text-[12px] text-white/85">
            {ad.subtitle}
          </p>
        )}
        <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-brand-600 px-3.5 py-1.5 text-[11.5px] font-extrabold text-white">
          Learn more <ArrowRight size={12} />
        </span>
      </div>
    </a>
  );
}

function MobileInlineAd({ ad }) {
  const img = getFullImageUrl(ad.image_url);
  return (
    <a
      href={ad.link_url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-[140px] w-full overflow-hidden rounded-2xl bg-ink-900 text-white shadow-md"
    >
      <div className="absolute inset-0">
        {img ? (
          <img
            src={img}
            alt={ad.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-navy-600 to-brand-600" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
        Sponsored
      </span>
      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <h3 className="line-clamp-2 text-[14px] font-black leading-tight text-white">
          {ad.title}
        </h3>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-white/95">
          Learn more <ArrowRight size={11} />
        </span>
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════════════════════
   AdSection — hero (rotating) + 2 mini  (DESKTOP)
   ═══════════════════════════════════════════════════════ */
function AdSection({ ads }) {
  const heroAds = useMemo(() => ads.slice(0, 3), [ads]);
  const extraAds = useMemo(() => ads.slice(3, 6), [ads]);

  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (heroAds.length < 2) return;
    timerRef.current = setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroAds.length);
    }, HERO_ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [heroAds.length]);

  if (heroAds.length === 0) return null;

  const hero = heroAds[heroIdx];
  const mini1 = heroAds[1] || heroAds[0];
  const mini2 = heroAds[2] || heroAds[0];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="col-span-1 sm:col-span-2 lg:row-span-2">
          <HeroAd ad={hero} index={heroIdx} total={heroAds.length} />
        </div>
        <MiniAd ad={mini1} />
        <MiniAd ad={mini2} />
      </div>

      {extraAds.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {extraAds.map((ad) => (
            <ExtraAd key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroAd({ ad, index, total }) {
  const img = getFullImageUrl(ad.image_url);
  return (
    <a
      key={ad.id}
      href={ad.link_url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-full min-h-[340px] overflow-hidden rounded-2xl bg-ink-900 text-white shadow-lg transition-transform hover:-translate-y-0.5 lg:min-h-[420px]"
      style={{ animation: "fadeIn 500ms ease-out" }}
    >
      <div className="absolute inset-0">
        {img ? (
          <img
            src={img}
            alt={ad.title}
            className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-600 to-navy-600" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
        <span className="inline-block w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
          Sponsored
        </span>
        <h2 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-white sm:text-3xl">
          {ad.title}
        </h2>
        {ad.subtitle && (
          <p className="mt-2 line-clamp-1 text-sm text-white/90 sm:text-base">
            {ad.subtitle}
          </p>
        )}
        <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12.5px] font-extrabold text-white shadow-brand transition-colors group-hover:bg-brand-700">
          Learn more
          <ArrowRight size={13} />
        </span>
      </div>
      {total > 1 && (
        <div className="absolute bottom-4 right-6 z-20 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === index ? "w-6 bg-white" : "w-1.5 bg-white/50")
              }
            />
          ))}
        </div>
      )}
    </a>
  );
}

function MiniAd({ ad }) {
  const img = getFullImageUrl(ad.image_url);
  return (
    <a
      href={ad.link_url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative col-span-1 block h-[160px] overflow-hidden rounded-2xl bg-ink-900 text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:h-[200px] lg:h-full lg:min-h-[200px]"
    >
      <div className="absolute inset-0">
        {img ? (
          <img
            src={img}
            alt={ad.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-navy-600 to-brand-600" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <span className="inline-block w-fit rounded-full bg-white/20 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
          Sponsored
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-[14px] font-black leading-tight text-white">
          {ad.title}
        </h3>
        {ad.subtitle && (
          <p className="mt-1 line-clamp-1 text-[11.5px] text-white/85">
            {ad.subtitle}
          </p>
        )}
      </div>
    </a>
  );
}

function ExtraAd({ ad }) {
  const img = getFullImageUrl(ad.image_url);
  return (
    <a
      href={ad.link_url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-[150px] overflow-hidden rounded-2xl bg-ink-900 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="absolute inset-0">
        {img ? (
          <img
            src={img}
            alt={ad.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-600 to-navy-600" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white backdrop-blur">
        Sponsored
      </span>
      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <h3 className="line-clamp-2 text-[14.5px] font-black leading-tight text-white">
          {ad.title}
        </h3>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-white/95">
          Learn more <ArrowRight size={11} />
        </span>
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════════════════════
   Circles & tabs
   ═══════════════════════════════════════════════════════ */

function TraderCircle({ trader }) {
  const shop = trader.TraderProfile?.shop_name || trader.full_name || "Shop";
  const short = shop.length > 14 ? shop.slice(0, 13) + "…" : shop;
  const img = getFullImageUrl(trader.profile_image);
  const rating = parseFloat(trader.TraderProfile?.rating_avg) || 0;

  return (
    <Link
      to={`/traders/${trader.id}`}
      className="group flex w-[96px] shrink-0 flex-col items-center"
    >
      <div className="relative">
        <div className="h-[76px] w-[76px] overflow-hidden rounded-full border-2 border-brand-600/40 bg-white p-0.5 transition-transform group-hover:scale-105 dark:bg-ink-900">
          {img ? (
            <img
              src={img}
              alt={shop}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/10">
              <Store size={26} />
            </div>
          )}
        </div>
        {rating > 0 && (
          <span className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full border-2 border-white bg-white px-1.5 py-0.5 text-[10px] font-black text-ink-900 shadow dark:border-ink-900 dark:bg-ink-900 dark:text-ink-100">
            ⭐ {rating.toFixed(1)}
          </span>
        )}
      </div>
      <span className="mt-2 line-clamp-1 w-full text-center text-[11px] font-bold text-ink-800 dark:text-ink-200">
        {short}
      </span>
    </Link>
  );
}

function MarketCircle({ market }) {
  const img = getFullImageUrl(market.logo_image);
  const name =
    market.name?.length > 14 ? market.name.slice(0, 13) + "…" : market.name;
  const isActive = market.is_active !== false;

  return (
    <Link
      to={`/markets/${market.id}`}
      className="group flex w-[104px] shrink-0 flex-col items-center"
    >
      <div className="relative">
        <div className="h-[76px] w-[76px] overflow-hidden rounded-full border-2 border-ink-200 bg-ink-50 transition-transform group-hover:scale-105 dark:border-ink-800 dark:bg-ink-900">
          {img ? (
            <img
              src={img}
              alt={market.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-400">
              <Store size={26} />
            </div>
          )}
        </div>
        <span
          className={
            "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-ink-900 " +
            (isActive ? "bg-emerald-500" : "bg-ink-300")
          }
          title={isActive ? "Active market" : "Inactive"}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      </div>
      <span className="mt-2 line-clamp-1 w-full text-center text-[11px] font-bold text-ink-800 dark:text-ink-200">
        {name}
      </span>
    </Link>
  );
}

function SectionHeader({ icon, title, subtitle, to }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[17px] font-black tracking-tight text-ink-900 dark:text-ink-100">
          {icon}
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-ink-500 dark:text-ink-400">
            {subtitle}
          </p>
        )}
      </div>
      {to && (
        <Link
          to={to}
          className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
        >
          View all <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function ProductSkeletonGrid({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800"
        >
          <div className="aspect-square w-full animate-pulse bg-ink-100 dark:bg-ink-800" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-ink-200 dark:bg-ink-700" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-200 dark:bg-ink-700" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink-200 dark:bg-ink-700" />
          </div>
        </div>
      ))}
    </div>
  );
}