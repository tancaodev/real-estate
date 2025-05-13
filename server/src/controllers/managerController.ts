import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { wktToGeoJSON } from '@terraformer/wkt'

const prisma = new PrismaClient()

export const getManager = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cognitoId } = req.params
        const manager = await prisma.manager.findUnique({
            where: { cognitoId }
        })

        if (manager) {
            res.json(manager)
        } else {
            res.status(404).json({ message: 'Manager not found' })
        }
    } catch (error: any) {
        res.status(500).json({ message: `Error retrieving manager: ${error.message}` })
    }
}

export const createManager = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cognitoId, name, email, phoneNumber } = req.body
        const manager = await prisma.manager.create({
            data: {
                cognitoId,
                name,
                email,
                phoneNumber
            }
        })

        res.status(201).json(manager)
    } catch (error: any) {
        res.status(500).json({ message: `Error creating manager: ${error.message}` })
    }
}

export const updateManager = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cognitoId } = req.params
        const { name, email, phoneNumber } = req.body

        const updatedManager = await prisma.manager.update({
            where: { cognitoId },
            data: {
                name,
                email,
                phoneNumber
            }
        })

        res.json(updatedManager)
    } catch (error: any) {
        res.status(500).json({ message: `Error updating manager: ${error.message}` })
    }
}

/**
 * Retrieves all properties associated with a specific manager
 * 
 * This function:
 * 1. Gets the manager's cognitoId from request parameters
 * 2. Fetches all properties where managerCognitoId matches
 * 3. For each property, converts the WKT coordinates to GeoJSON format
 * 4. Returns an array of properties with formatted location data
 * 
 * @param req - Express request object containing manager's cognitoId
 * @param res - Express response object
 * @returns Promise<void>
 */
export const getManagerProperties = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get manager's cognitoId from request parameters
        const { cognitoId } = req.params
        
        // Fetch all properties associated with this manager
        const properties = await prisma.property.findMany({
            where: { managerCognitoId: cognitoId },
            include: {
                location: true
            }
        })

        // Process each property to format location coordinates
        const propertiesWithFormattedLocation = await Promise.all(
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

        res.json(propertiesWithFormattedLocation)
    } catch (error: any) {
        res.status(500).json({ message: `Error retrieving manager properties: ${error.message}` })
    }
}
