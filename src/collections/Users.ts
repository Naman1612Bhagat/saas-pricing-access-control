import type { CollectionConfig, Access } from 'payload'

export const isAdmin: Access = ({ req }) => {
  return Boolean(req.user && req.user.role === 'admin')
}

export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return {
    id: {
      equals: req.user.id,
    },
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
    create: () => true,
    admin: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
      access: {
        create: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
        update: ({ req }) => Boolean(req.user && req.user.role === 'admin'),
      },
    },
  ],
}
