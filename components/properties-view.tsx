"use client";

import { Building2, MapPin, Bed, Bath } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";

interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  rent: number;
  status: "occupied" | "vacant" | "maintenance";
  image: string;
}

const mockProperties: Property[] = [
  {
    id: 1,
    name: "Sunset Villa",
    address: "123 Ocean Drive, Miami, FL",
    type: "Single Family",
    bedrooms: 4,
    bathrooms: 3,
    rent: 3500,
    status: "occupied",
    image: "/api/placeholder/400/300",
  },
  {
    id: 2,
    name: "Downtown Loft",
    address: "456 Main St, New York, NY",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    rent: 4200,
    status: "occupied",
    image: "/api/placeholder/400/300",
  },
  {
    id: 3,
    name: "Mountain Retreat",
    address: "789 Pine Rd, Denver, CO",
    type: "Cabin",
    bedrooms: 3,
    bathrooms: 2,
    rent: 2800,
    status: "vacant",
    image: "/api/placeholder/400/300",
  },
  {
    id: 4,
    name: "Urban Studio",
    address: "321 Tech Blvd, San Francisco, CA",
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    rent: 3200,
    status: "maintenance",
    image: "/api/placeholder/400/300",
  },
  {
    id: 5,
    name: "Lakeside Condo",
    address: "654 Lake Shore Dr, Chicago, IL",
    type: "Condo",
    bedrooms: 2,
    bathrooms: 2,
    rent: 2900,
    status: "occupied",
    image: "/api/placeholder/400/300",
  },
  {
    id: 6,
    name: "Garden Townhouse",
    address: "987 Garden Way, Seattle, WA",
    type: "Townhouse",
    bedrooms: 3,
    bathrooms: 2.5,
    rent: 3300,
    status: "vacant",
    image: "/api/placeholder/400/300",
  },
];

export function PropertiesView() {
  const getStatusBadge = (status: Property["status"]) => {
    switch (status) {
      case "occupied":
        return <Badge variant="success">Occupied</Badge>;
      case "vacant":
        return <Badge variant="secondary">Vacant</Badge>;
      case "maintenance":
        return <Badge variant="destructive">Maintenance</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
          Properties
        </h2>
        <p className="text-zinc-400">Manage your property portfolio</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockProperties.map((property) => (
          <Card
            key={property.id}
            className="overflow-hidden transition-all hover:shadow-lg hover:shadow-zinc-900/50"
          >
            <div className="aspect-video w-full bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="h-16 w-16 text-zinc-700" />
              </div>
              <div className="absolute top-3 right-3">
                {getStatusBadge(property.status)}
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-zinc-50">{property.name}</CardTitle>
              <CardDescription className="flex items-start gap-1">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-xs">{property.address}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{property.type}</span>
                <span className="font-semibold text-zinc-50">
                  ${property.rent.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span>{property.bedrooms} bed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span>{property.bathrooms} bath</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
