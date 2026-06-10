export interface News {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  content: string;
  image: string;
  author: string;
  category: string;
  tags: string[];
  date: Date;
  relatedNews?: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsFormData {
  title: string;
  description: string;
  content: string;
  image: string;
  author: string;
  category: string;
  tags: string[];
  relatedNews?: string[];
  published: boolean;
}

