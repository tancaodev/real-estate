import { Request, Response } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getProperties = async (req: Request, res: Response): Promise<void> => {
    try {
        const { favoriteIds, priceMin, priceMax, beds, baths, propertyType, squareFeetMin, squareFeetMax, amenities, avaiableFrom, latitude, longitude } =
            req.query

        let whereConditions: Prisma.Sql[] = []

        if (favoriteIds) {
            const favoriteIdsArray = (favoriteIds as string).split(',').map(Number)
            whereConditions.push(Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`)
        }

        if (priceMin) {
            whereConditions.push(Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`)
        }
        if (priceMax) {
            whereConditions.push(Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`)
        }

        if (beds && beds !== 'any') {
            whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`)
        }

        if (baths && baths !== 'any') {
            whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`)
        }
        if (squareFeetMin) {
            whereConditions.push(Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`)
        }

        if (squareFeetMax) {
            whereConditions.push(Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`)
        }

        if (propertyType && propertyType !== 'any') {
            whereConditions.push(Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`)
        }

        if (amenities && amenities !== 'any') {
            const amenitiesArray = (amenities as string).split(',')

            whereConditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}`)
        }

        if (avaiableFrom && avaiableFrom !== 'any') {
            const avaiableFromDate = typeof avaiableFrom === 'string' ? avaiableFrom : null

            if (avaiableFromDate) {
                const date = new Date(avaiableFromDate)

                if (!isNaN(date.getTime())) {
                    whereConditions.push(
                        Prisma.sql`EXISTS (
                            SELECT 1 FROM 'Lease' l
                            WHERE l."propertyId" = p.id
                            AND l."startDate" <= ${date.toISOString()}
                        )`
                    )
                }
            }
        }

        if (latitude && longitude) {
            const lat = parseFloat(latitude as string)
            const lng = parseFloat(longitude as string)
            const radiusInKilometers = 1000
            const degrees = radiusInKilometers / 111 // Converts kilometers to degrees

            whereConditions.push(
                Prisma.sql`ST_DWithin(
                    l.coordinates::geometry, 
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 
                    ${degrees}
                )`
            )
        }
    } catch (error: any) {
        res.status(500).json({ message: `Error retrieving manager: ${error.message}` })
    }
}
