import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { decrypt } from '@typebot.io/lib/api/encryption/decrypt'
import got from 'got'

export const listTicketTypes = authenticatedProcedure.meta({
  openapi: {
    method: 'GET',
    path: '/trudesk/tickettypes',
    protect: true,
    summary: 'List Ticket Types',
    tags: ['Trudesk'],
  },
})
  .input(
    z.object({
      credentialsId: z.string(),
      workspaceId: z.string(),
    })
  ).output(

    z.object({
      types: z.array(z.object({
        id: z.string(),
        name: z.string(),
        priorities: z.array(z.object({
          id: z.string(),
          name: z.string()
        }))
      })),
      groups: z.array(z.object({
        id: z.string(),
        name: z.string()
      })),
      users: z.array(z.object({
        id: z.string(),
        name: z.string()
      })),
    })
    // @ts-ignore
  ).query(async ({ input: { credentialsId, workspaceId }, ctx: { user } }) => {
    try {
      const credentials = await prisma.credentials.findUnique({
        where: {
          id: credentialsId,
          workspaceId: workspaceId
        },
      });
      if (!credentials)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No credentials found',
        })
      const data = (await decrypt(
        credentials.data,
        credentials.iv
      )) as { userName: string, password: string, baseUrl: string };

      const loginResponse = await got.post(`${data.baseUrl}/api/v1/login`, {
        json: {
          username: data?.userName,
          password: data?.password,

        }
      }).json();
      const loginData = loginResponse as {
        accessToken: string,
        success: boolean
      }

      if (loginData.success && loginData.accessToken) {
        let resData = {};
        const ticketTypesResponse = await got.get(`${data.baseUrl}/api/v1/tickets/types`, {
          headers: {
            accessToken: `${loginData.accessToken}`
          }
        }).json();
        // @ts-ignore
        resData.types = ticketTypesResponse.map(type => {
          return {
            id: type._id,
            name: type.name,
            priorities: type.priorities.map(p => {
              return {
                id: p._id,
                name: p.name
              }
            })
          }
        })

        const ticketGroupsResponse = await got.get(`${data.baseUrl}/api/v1/groups`, {
          headers: {
            accessToken: `${loginData.accessToken}`
          }
        }).json();
        // @ts-ignore
        resData.groups = ticketGroupsResponse.groups.map(g => {
          return {
            id: g._id,
            name: g.name
          }
        })




        const ticketUsersAndAssigneesResponse = await got.get(`${data.baseUrl}/api/v1/users/all`, {
          headers: {
            accessToken: `${loginData.accessToken}`
          }
        }).json();

        // @ts-ignore
        resData.users = ticketUsersAndAssigneesResponse.filter(assignee => assignee.role.isAgent == true).map(usr => {
          return {
            id: usr._id,
            name: usr.fullname
          }
        })
        return resData
      } else {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not login into trudesk',
          cause: "Incorrect credentials",
        })
      }



    } catch (e) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not list ticket types',
        cause: e,
      })
    }

  })