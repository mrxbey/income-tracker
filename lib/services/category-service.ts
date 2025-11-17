import { db } from '@/lib/prisma'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validations'
import { NotFoundError } from '@/lib/errors'

export const categoryService = {
  /**
   * Get all categories for a user
   */
  async getAll(userId: string) {
    return db.category.findMany({
      where: { userId },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
  },

  /**
   * Get a single category
   */
  async getById(userId: string, categoryId: string) {
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!category) {
      throw new NotFoundError('Category')
    }

    return category
  },

  /**
   * Create a new category
   */
  async create(userId: string, data: CreateCategoryInput) {
    return db.category.create({
      data: {
        ...data,
        userId,
      },
      include: {
        parent: true,
        children: true,
      },
    })
  },

  /**
   * Update a category
   */
  async update(userId: string, categoryId: string, data: UpdateCategoryInput) {
    // Verify ownership
    await this.getById(userId, categoryId)

    return db.category.update({
      where: {
        id: categoryId,
      },
      data,
      include: {
        parent: true,
        children: true,
      },
    })
  },

  /**
   * Delete a category
   */
  async delete(userId: string, categoryId: string) {
    // Verify ownership
    await this.getById(userId, categoryId)

    return db.category.delete({
      where: {
        id: categoryId,
      },
    })
  },

  /**
   * Get category tree (hierarchical structure)
   */
  async getTree(userId: string) {
    const categories = await this.getAll(userId)

    // Build tree structure (only root categories with their children)
    const rootCategories = categories.filter((cat) => !cat.parentId)

    return rootCategories.map((root) => ({
      ...root,
      children: categories.filter((cat) => cat.parentId === root.id),
    }))
  },
}
