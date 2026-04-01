export type AlbumCategory =
  | "所有"
  | "精选"
  | "游记"
  | "奖项"
  | "作品"
  | "周边"
  | "日常"
  | "游戏"
  | "美食"
  | "动物"
  | "漫展"
  | "其他";

export type AlbumItem = {
  id: string;
  title: string;
  date: string;
  likes: number;
  image: string;
  category: Exclude<AlbumCategory, "所有">;
  featured?: boolean;
};

export const albumCategories: readonly AlbumCategory[] = [
  "所有",
  "精选",
  "游记",
  "奖项",
  "作品",
  "周边",
  "日常",
  "游戏",
  "美食",
  "动物",
  "漫展",
  "其他",
];

export const albumItems: readonly AlbumItem[] = [
  {
    id: "lyf-1",
    title: "李元芳",
    date: "2026-03-22",
    likes: 0,
    image: "/images/pic.jpg",
    category: "作品",
  },
  {
    id: "lyf-2",
    title: "李元芳",
    date: "2026-03-22",
    likes: 0,
    image: "/images/pic.jpg",
    category: "漫展",
  },
  {
    id: "lyf-3",
    title: "李元芳",
    date: "2026-03-22",
    likes: 0,
    image: "/images/pic.jpg",
    category: "精选",
  },
  {
    id: "lyf-4",
    title: "李元芳",
    date: "2026-03-22",
    likes: 0,
    image: "/images/pic.jpg",
    category: "日常",
  },
  {
    id: "lyf-5",
    title: "李元芳★",
    date: "2026-03-22",
    likes: 0,
    image: "/images/pic.jpg",
    category: "游戏",
    featured: true,
  },
  {
    id: "lyf-6",
    title: "李元芳",
    date: "2026-03-22",
    likes: 0,
    image: "/images/pic.jpg",
    category: "周边",
  },
  {
    id: "shore-1",
    title: "海岸随拍",
    date: "2025-12-16",
    likes: 3,
    image: "/images/scene-shore.svg",
    category: "游记",
  },
  {
    id: "cloudline-1",
    title: "云线",
    date: "2025-11-02",
    likes: 1,
    image: "/images/scene-cloudline.svg",
    category: "其他",
  },
  {
    id: "ridge-1",
    title: "山脊",
    date: "2025-10-25",
    likes: 2,
    image: "/images/scene-ridge.svg",
    category: "游记",
  },
  {
    id: "food-1",
    title: "今日餐盘",
    date: "2025-09-18",
    likes: 2,
    image: "/images/background.png",
    category: "美食",
  },
  {
    id: "cat-1",
    title: "路过小猫",
    date: "2025-08-02",
    likes: 4,
    image: "/images/hero-background.svg",
    category: "动物",
  },
  {
    id: "award-1",
    title: "获奖记录",
    date: "2025-07-10",
    likes: 6,
    image: "/images/background.png",
    category: "奖项",
  },
];

