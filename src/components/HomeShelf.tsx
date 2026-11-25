import { useState } from 'react';
import { ownedHomeItems, spendStarsForHomeItem, getState, SHOP_ITEM_STARS } from '../lib/engagement/store';
import { HOME_ITEMS } from '../data/homeItems';
import { CARD_DAY } from '../lib/ui/tokens';
import { ArtImg } from './ArtImg';
import { IconHome, IconStar } from './icons';

/**
 * kids-UX AC-4.2 / external-review r1 #4: the gift-box decorations
 * ("đã vào nhà của em") need a persistent home - this shelf sits inside
 * the launchpad's home tile so a child can revisit what they earned.
 * CR-146 (P1-2): adds the star shop ("Đổi quà") - 25 stars buys ONE
 * unowned item the child picks directly (no lottery, PO ruling).
 */
export default function HomeShelf() {
  const [items, setItems] = useState(() => ownedHomeItems());
  const [stars, setStars] = useState(() => getState().totalStars);
  const [shopOpen, setShopOpen] = useState(false);
  const [justBought, setJustBought] = useState<string | null>(null);

  const ownedIds = new Set(items.map((i) => i.id));
  const unowned = HOME_ITEMS.filter((i) => !ownedIds.has(i.id));
  const canAfford = stars >= SHOP_ITEM_STARS;

  function buy(itemId: string) {
    const result = spendStarsForHomeItem(itemId);
    if (!result) return;
    setItems(ownedHomeItems());
    setStars(getState().totalStars);
    setJustBought(result.item.id);
  }

  return (
    <div data-testid="home-shelf" className={`mt-4 ${CARD_DAY} text-left`}>
      <h2 className="font-display text-xl font-extrabold text-amber-800"><IconHome size={20} className="mr-1.5 inline-block" /> Nhà của em</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Chưa có đồ chơi nào - hoàn thành bài luyện để mở hộp quà nhé!
        </p>
      ) : (
        <>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Đồ chơi em đã nhận">
            {items.map((item) => (
              <li
                key={item.id}
                data-testid={`home-item-${item.id}`}
                title={item.nameVi}
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-2xl ring-1 ring-sky-200 ${justBought === item.id ? 'ring-2 ring-amber-400' : ''}`}
              >
                <ArtImg key={item.art} src={item.art} emoji={item.emoji} size={36} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold text-slate-500">
            {items.length} món đồ trong nhà
          </p>
        </>
      )}
      {/* CR-146: star shop - the first real sink for stars. Child picks
          the exact item (no lottery); greyed out below 25 stars. */}
      {unowned.length > 0 && (
        <div className="mt-3 border-t border-amber-200/70 pt-3">
          <button
            type="button"
            data-testid="shop-toggle"
            onClick={() => setShopOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-left ring-1 ring-amber-200 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 motion-reduce:transition-none"
          >
            <span className="text-sm font-extrabold text-amber-800">Đổi quà - {SHOP_ITEM_STARS} sao một món</span>
            <span className="flex items-center gap-1 text-sm font-extrabold text-amber-700">
              <IconStar size={14} className="text-amber-500" /> {stars}
            </span>
          </button>
          {shopOpen && (
            <ul className="mt-2 grid grid-cols-4 gap-2" aria-label="Quà đổi bằng sao">
              {unowned.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-testid={`shop-item-${item.id}`}
                    disabled={!canAfford}
                    onClick={() => buy(item.id)}
                    title={`${item.nameVi} - ${SHOP_ITEM_STARS} sao`}
                    aria-label={`Đổi ${item.nameVi} bằng ${SHOP_ITEM_STARS} sao`}
                    className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 ring-1 transition focus:outline-none focus:ring-2 focus:ring-amber-400 motion-reduce:transition-none ${
                      canAfford
                        ? 'bg-white ring-amber-200 hover:-translate-y-0.5 hover:ring-amber-400 motion-reduce:hover:translate-y-0'
                        : 'cursor-not-allowed bg-slate-50 opacity-50 ring-slate-200'
                    }`}
                  >
                    <ArtImg key={item.art} src={item.art} emoji={item.emoji} size={30} />
                    <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-amber-700">
                      <IconStar size={10} className="text-amber-500" /> {SHOP_ITEM_STARS}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
