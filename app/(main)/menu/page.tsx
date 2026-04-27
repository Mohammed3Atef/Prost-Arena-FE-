"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import MenuItemCard from "../../../components/food/MenuItemCard";
import api from "../../../services/api/client";
import { cn } from "../../../lib/utils";

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string | null;
}
interface MenuItem {
  _id: string;
  name: string;
  description: string;
  image: string | null;
  price: number;
  xpReward: number;
  isSecret: boolean;
  requiredLevel: number;
  tags: string[];
  rating: number;
  isAvailable: boolean;
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    api
      .get("/menu/categories")
      .then((r) => setCategories(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params: Record<string, string> = { limit: "24", page: "1" };
    if (activeCategory !== "all") params.category = activeCategory;
    if (search) params.search = search;

    api
      .get("/menu/items", { params })
      .then((r) => {
        setItems(r.data.data ?? []);
        setHasMore(r.data.pagination?.hasNext ?? false);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Our Menu</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Order to earn XP and unlock secret items
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all",
              activeCategory === "all"
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200",
            )}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setActiveCategory(c._id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all flex items-center gap-1.5",
                activeCategory === c._id
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200",
              )}
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </button>
          ))}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-56 sm:h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            {items.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-400">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-lg font-medium">No items found</p>
              </div>
            ) : (
              items.map((item, i) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <MenuItemCard item={item} />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
