import { Manager, Tenant } from '@/types/prismaTypes'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'

export const api = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,

        // If you don't want being DDOSed, you can use this to add a token to the request
        // so that the server can identify who is making the request
        prepareHeaders: async (headers) => {
            const session = await fetchAuthSession()
            const { idToken } = session.tokens ?? {}

            if (idToken) {
                headers.set('Authorization', `Bearer ${idToken}`)
            }

            return headers
        }
    }),
    reducerPath: 'api',
    tagTypes: [],
    endpoints: (build) => ({
        getAuthUser: build.query<User, void>({
            queryFn: async (_, _queryApi, _extraOptions, fetchWithBQ) => {
                try {
                    const session = await fetchAuthSession()
                    const { idToken } = session.tokens ?? {}
                    const user = await getCurrentUser()
                    const userRole = idToken?.payload['custom:role'] as string
                    const endpoint = userRole === 'manager' ? `/manager/user/${user.userId}` : `/tenants/user/${user.userId}`

                    let userDetailsResponse = await fetchWithBQ(endpoint)

                    // if user doesn't exist, create a new user
                    return {
                        data: {
                            cognitoInfo: { ...user },
                            userInfo: userDetailsResponse.data as Tenant | Manager,
                            userRole
                        }
                    }
                } catch (error: any) {
                    return { error: error.message || 'Could not fetch user data' }
                }
            }
        }),
    })
})

export const {} = api
