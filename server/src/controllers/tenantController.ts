import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { wktToGeoJSON } from '@terraformer/wkt'

const prisma = new PrismaClient()

export const getTenant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cognitoId } = req.params
        const tenant = await prisma.tenant.findUnique({
            where: { cognitoId },
            include: {
                favorites: true
            }
        })

        if (tenant) {
            res.json(tenant)
        } else {
            res.status(404).json({ message: 'Tenant not found' })
        }
    } catch (error: any) {
        res.status(500).json({ message: `Error retrieving tenant: ${error.message}` })
    }
}

export const createTenant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cognitoId, name, email, phoneNumber } = req.body
        const tenant = await prisma.tenant.create({
            data: {
                cognitoId,
                name,
                email,
                phoneNumber
            }
        })

        res.status(201).json(tenant)
    } catch (error: any) {
        res.status(500).json({ message: `Error creating tenant: ${error.message}` })
    }
}

export const updateTenant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cognitoId } = req.params
        const { name, email, phoneNumber } = req.body

        const updatedTenant = await prisma.tenant.update({
            where: { cognitoId },
            data: {
                name,
                email,
                phoneNumber
            }
        })

        res.json(updatedTenant)
    } catch (error: any) {
        res.status(500).json({ message: `Error updating tenant: ${error.message}` })
    }
}

/**
 * Retrieves all residences where the tenant is currently living
 *
 * This function:
 * 1. Gets the tenant's cognitoId from request parameters
 * 2. Fetches all properties where the tenant is currently residing
 * 3. For each property, converts the WKT coordinates to GeoJSON format
 * 4. Returns an array of properties with formatted location data
 *
 * @param req - Express request object containing tenant's cognitoId
 * @param res - Express response object
 * @returns Promise<void>
 */
export const getCurrentResidences = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get manager's cognitoId from request parameters
        const { cognitoId } = req.params

        // Fetch all properties associated with this manager
        const properties = await prisma.property.findMany({
            where: {
                tenants: {
                    some: { cognitoId }
                }
            },
            include: {
                location: true
            }
        })

        // Process each property to format location coordinates
        const residencesWithFormattedLocation = await Promise.all(
            properties.map(async (property) => {
                // Get WKT coordinates from database
                const coordinates: { coordinates: string }[] =
                    await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`

                // Convert WKT to GeoJSON format
                const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || '')
                const longitude = geoJSON.coordinates[0]
                const latitude = geoJSON.coordinates[1]

                // Return property with formatted location data
                return {
                    ...property,
                    location: {
                        ...property.location,
                        coordinates: {
                            longitude,
                            latitude
                        }
                    }
                }
            })
        )

        res.json(residencesWithFormattedLocation)
    } catch (error: any) {
        res.status(500).json({ message: `Error retrieving current residences: ${error.message}` })
    }
}

/**
 * Adds a property to a tenant's favorites list
 *
 * This function:
 * 1. Gets tenant's cognitoId and propertyId from request parameters
 * 2. Checks if the property is already in tenant's favorites
 * 3. If not, adds the property to favorites using Prisma's connect operation
 * 4. Returns updated tenant data with favorites list
 *
 * @param req - Express request object containing tenant's cognitoId and propertyId
 * @param res - Express response object
 * @returns Promise<void>
 */
export const addFavoriteProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract cognitoId and propertyId from request parameters
        const { cognitoId, propertyId } = req.params

        // Find tenant and include their current favorites
        const tenant = await prisma.tenant.findUnique({
            where: { cognitoId },
            include: {
                favorites: true
            }
        })

        // Convert propertyId to number and get existing favorites
        const propertyIdNumber = Number(propertyId)
        const existingFavorites = tenant?.favorites || []

        // Check if property is already in favorites
        if (!existingFavorites.some((fav) => fav.id === propertyIdNumber)) {
            // Add property to favorites if not already present
            const updatedTenant = await prisma.tenant.update({
                where: { cognitoId },
                data: {
                    favorites: {
                        connect: { id: propertyIdNumber }
                    }
                },
                include: { favorites: true }
            })

            res.json(updatedTenant)
        } else {
            // Return conflict status if property is already in favorites
            res.status(409).json({ message: 'Property already added as favorite' })
        }
    } catch (error: any) {
        // Handle any errors that occur during the process
        res.status(500).json({ message: `Error retrieving adding favorite property: ${error.message}` })
    }
}

/**
 * Removes a property from tenant's favorites list
 * 
 * This function:
 * 1. Gets tenant's cognitoId and propertyId from request parameters
 * 2. Converts propertyId to number
 * 3. Uses Prisma to disconnect the property from favorites list
 * 4. Returns updated tenant data with favorites list
 *
 * @param req - Express request object containing tenant's cognitoId and propertyId
 * @param res - Express response object
 * @returns Promise<void>
 */
export const removeFavoriteProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract cognitoId and propertyId from request parameters
        const { cognitoId, propertyId } = req.params
        // Convert propertyId to number
        const propertyIdNumber = Number(propertyId)

        // Update tenant by disconnecting property from favorites list
        const updatedTenant = await prisma.tenant.update({
            where: { cognitoId },
            data: {
                favorites: {
                    disconnect: { id: propertyIdNumber }
                }
            },
            include: { favorites: true }
        })

        // Return updated tenant data
        res.json(updatedTenant)
    } catch (error: any) {
        // Handle any errors that occur during the process
        res.status(500).json({ message: `Error removing favorite property: ${error.message}` })
    }
}
