-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATING', 'BOOKED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'GOOGLE', 'INSTAGRAM', 'TIKTOK', 'REFERRAL', 'PLANNER', 'AIRBNB', 'GIGSALAD', 'THUMBTACK', 'YHANGRY', 'THE_BASH', 'REPEAT_CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('PRICE', 'DATE_UNAVAILABLE', 'NO_RESPONSE', 'COMPETITOR', 'BUDGET_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PRIVATE_DINNER', 'PLATED_DINNER', 'FAMILY_STYLE', 'BUFFET', 'BRUNCH', 'COCKTAIL', 'WEDDING', 'CORPORATE', 'COOKING_CLASS', 'VACATION_CHEF', 'DROP_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('TEXT', 'CALL', 'EMAIL', 'INSTAGRAM', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "SpaceLevel" AS ENUM ('NONE', 'LIMITED', 'MODERATE', 'AMPLE');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('NONE', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('INQUIRY', 'TENTATIVE', 'BOOKED', 'PLANNING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceStyle" AS ENUM ('PLATED', 'FAMILY_STYLE', 'BUFFET', 'STATIONS', 'PASSED', 'DROP_OFF', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "DietarySeverity" AS ENUM ('PREFERENCE', 'INTOLERANCE', 'ALLERGY', 'SEVERE_ALLERGY');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'BALANCE', 'TIP', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('PROJECTED', 'ACTUAL');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'BEVERAGE', 'LABOR', 'PREP_LABOR', 'TRAVEL', 'MILEAGE', 'RENTALS', 'EQUIPMENT', 'DISPOSABLES', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarEntryType" AS ENUM ('SHOPPING', 'PREP', 'DEADLINE', 'TASTING', 'MEETING', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "IngredientCategory" AS ENUM ('PRODUCE', 'MEAT', 'SEAFOOD', 'DAIRY', 'DRY_GOODS', 'BAKERY', 'FROZEN', 'BEVERAGES', 'SPECIALTY', 'DISPOSABLES', 'OTHER');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('SAUCE', 'PROTEIN', 'STARCH', 'VEGETABLE', 'SALAD', 'SOUP', 'DRESSING', 'GARNISH', 'BAKED', 'DESSERT', 'BASE', 'BEVERAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "PrepPhase" AS ENUM ('SEVERAL_DAYS', 'TWO_DAYS', 'DAY_BEFORE', 'EVENT_MORNING', 'BEFORE_DEPARTURE', 'ON_SITE');

-- CreateEnum
CREATE TYPE "ScalingMode" AS ENUM ('LINEAR', 'FIXED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "Course" AS ENUM ('WELCOME_BITE', 'PASSED_APPETIZER', 'APPETIZER', 'SOUP', 'SALAD', 'ENTREE', 'SIDE', 'DESSERT', 'LATE_NIGHT', 'BEVERAGE');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "HoldingQuality" AS ENUM ('POOR', 'FAIR', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "MenuStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED');

-- CreateEnum
CREATE TYPE "ShoppingStatus" AS ENUM ('PENDING', 'PURCHASED', 'NOT_FOUND', 'SUBSTITUTED');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "RunOfShowKind" AS ENUM ('ARRIVAL', 'TASK', 'FIRE', 'SERVICE', 'BREAKDOWN', 'DEPARTURE');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('CHEF', 'SOUS_CHEF', 'KITCHEN_ASSISTANT', 'SERVER', 'BARTENDER', 'CAPTAIN', 'DISHWASHER', 'OTHER');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'FLAT');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('NEEDED', 'INVITED', 'CONFIRMED', 'COMPLETED', 'PAID');

-- CreateEnum
CREATE TYPE "EquipmentCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR');

-- CreateEnum
CREATE TYPE "PackStatus" AS ENUM ('REQUIRED', 'PACKED', 'LOADED', 'ON_SITE', 'RETURNED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Prime Plates',
    "ownerName" TEXT NOT NULL DEFAULT 'Chef',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "targetMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "minimumMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "targetFoodCostPct" DOUBLE PRECISION NOT NULL DEFAULT 28,
    "mileageRateCents" INTEGER NOT NULL DEFAULT 70,
    "defaultDepositPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "finalCountLeadDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedFeeCents" INTEGER NOT NULL DEFAULT 0,
    "processingPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingFixedCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isDirect" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "eventDate" DATE,
    "location" TEXT,
    "guestCount" INTEGER,
    "eventType" "EventType",
    "requestedService" TEXT,
    "budgetCents" INTEGER,
    "cuisineRequest" TEXT,
    "dietaryRestrictions" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "platformId" TEXT,
    "notes" TEXT,
    "estimatedValueCents" INTEGER,
    "nextFollowUpDate" DATE,
    "lastContactedAt" TIMESTAMP(3),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "boardOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lostReason" "LostReason",
    "lostNotes" TEXT,
    "clientId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "preferredContact" "ContactMethod",
    "dietaryRestrictions" TEXT,
    "allergies" TEXT,
    "likes" TEXT,
    "dislikes" TEXT,
    "importantNotes" TEXT,
    "internalNotes" TEXT,
    "referralSource" "LeadSource",
    "referredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "parkingInstructions" TEXT,
    "gateCode" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "stoveType" TEXT,
    "burnerCount" INTEGER,
    "hasOven" BOOLEAN,
    "ovenNotes" TEXT,
    "hasGrill" BOOLEAN,
    "hasMicrowave" BOOLEAN,
    "fridgeSpace" "SpaceLevel",
    "freezerSpace" "SpaceLevel",
    "counterSpace" "SpaceLevel",
    "hasSink" BOOLEAN,
    "hasDishwasher" BOOLEAN,
    "cookware" TEXT,
    "sheetPans" TEXT,
    "servingPieces" TEXT,
    "plates" "Availability",
    "flatware" "Availability",
    "glassware" "Availability",
    "electricalNotes" TEXT,
    "outdoorCooking" TEXT,
    "otherNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "venueId" TEXT,
    "platformId" TEXT,
    "eventType" "EventType" NOT NULL,
    "serviceStyle" "ServiceStyle" NOT NULL DEFAULT 'PLATED',
    "status" "EventStatus" NOT NULL DEFAULT 'BOOKED',
    "date" DATE NOT NULL,
    "endDate" DATE,
    "arrivalTime" TEXT,
    "serviceTime" TEXT,
    "endTime" TEXT,
    "guestCount" INTEGER NOT NULL,
    "guestCountConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "finalCountDueDate" DATE,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "depositDueDate" DATE,
    "balanceDueDate" DATE,
    "shoppingDate" DATE,
    "prepStartDate" DATE,
    "roundTripMiles" DOUBLE PRECISION,
    "description" TEXT,
    "dietarySummary" TEXT,
    "criticalNotes" TEXT,
    "internalNotes" TEXT,
    "duplicatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestDietaryNote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestName" TEXT,
    "restriction" TEXT NOT NULL,
    "severity" "DietarySeverity" NOT NULL DEFAULT 'PREFERENCE',
    "count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestDietaryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "receivedOn" DATE NOT NULL,
    "method" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventExpense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "ExpenseKind" NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "amountCents" INTEGER NOT NULL,
    "date" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReview" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rating" INTEGER,
    "wentWell" TEXT,
    "wentWrong" TEXT,
    "clientLoved" TEXT,
    "changeNextTime" TEXT,
    "ranOut" TEXT,
    "excessLeftovers" TEXT,
    "serveMenuAgain" BOOLEAN,
    "takeClientAgain" BOOLEAN,
    "operationalNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "eventId" TEXT,
    "venueId" TEXT,
    "dishId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CalendarEntryType" NOT NULL DEFAULT 'OTHER',
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "eventId" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IngredientCategory" NOT NULL DEFAULT 'OTHER',
    "purchaseUnit" TEXT NOT NULL,
    "packageQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "packageUnit" TEXT NOT NULL,
    "packagePriceCents" INTEGER NOT NULL DEFAULT 0,
    "yieldPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "gramsPerMl" DOUBLE PRECISION,
    "gramsPerEach" DOUBLE PRECISION,
    "preferredVendorId" TEXT,
    "notes" TEXT,
    "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RecipeCategory" NOT NULL DEFAULT 'OTHER',
    "yieldPortions" DOUBLE PRECISION NOT NULL,
    "yieldDescription" TEXT,
    "method" TEXT,
    "prepMinutes" INTEGER,
    "cookMinutes" INTEGER,
    "equipment" TEXT,
    "allergens" TEXT[],
    "dietaryTags" TEXT[],
    "holdingInstructions" TEXT,
    "reheatingInstructions" TEXT,
    "transportNotes" TEXT,
    "platingInstructions" TEXT,
    "chefNotes" TEXT,
    "defaultPrepPhase" "PrepPhase" NOT NULL DEFAULT 'DAY_BEFORE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "prepNote" TEXT,
    "scalingMode" "ScalingMode" NOT NULL DEFAULT 'LINEAR',
    "scalingFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "scalingNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "course" "Course" NOT NULL,
    "cuisine" TEXT,
    "protein" TEXT,
    "dietaryTags" TEXT[],
    "allergens" TEXT[],
    "serviceStyles" "ServiceStyle"[],
    "difficulty" "Level" NOT NULL DEFAULT 'MEDIUM',
    "prepIntensity" "Level" NOT NULL DEFAULT 'MEDIUM',
    "platingDifficulty" "Level" NOT NULL DEFAULT 'MEDIUM',
    "holdingQuality" "HoldingQuality" NOT NULL DEFAULT 'GOOD',
    "chefNotes" TEXT,
    "photoUrl" TEXT,
    "inLibrary" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishComponent" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "portionsPerServing" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DishComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "MenuStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "clientNotes" TEXT,
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCourse" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fireTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "guestCount" INTEGER,
    "portionsPerGuest" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItemState" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "status" "ShoppingStatus" NOT NULL DEFAULT 'PENDING',
    "quantityOverride" DOUBLE PRECISION,
    "actualPriceCents" INTEGER,
    "substitution" TEXT,
    "vendorId" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingItemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingExtraItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IngredientCategory" NOT NULL DEFAULT 'OTHER',
    "quantity" TEXT,
    "vendorId" TEXT,
    "status" "ShoppingStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedCents" INTEGER,
    "actualPriceCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingExtraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepTask" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phase" "PrepPhase" NOT NULL,
    "recipeId" TEXT,
    "dishId" TEXT,
    "estimatedMinutes" INTEGER,
    "assigneeId" TEXT,
    "status" "PrepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunOfShowItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "RunOfShowKind" NOT NULL DEFAULT 'TASK',
    "details" TEXT,
    "doneLines" INTEGER[],
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunOfShowItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" "StaffRole" NOT NULL,
    "rateCents" INTEGER NOT NULL DEFAULT 0,
    "rateType" "RateType" NOT NULL DEFAULT 'HOURLY',
    "notes" TEXT,
    "availabilityNotes" TEXT,
    "reliabilityNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "role" "StaffRole" NOT NULL,
    "rateCents" INTEGER NOT NULL DEFAULT 0,
    "rateType" "RateType" NOT NULL DEFAULT 'HOURLY',
    "callTime" TEXT,
    "endTime" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'NEEDED',
    "responsibilities" TEXT,
    "actualPayCents" INTEGER,
    "paidOn" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "quantityOwned" INTEGER NOT NULL DEFAULT 1,
    "quantityOutOfService" INTEGER NOT NULL DEFAULT 0,
    "storageLocation" TEXT,
    "condition" "EquipmentCondition" NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEquipment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "equipmentItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "PackStatus" NOT NULL DEFAULT 'REQUIRED',
    "notes" TEXT,

    CONSTRAINT "EventEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_eventId_key" ON "Lead"("eventId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpDate_idx" ON "Lead"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "Event_clientId_idx" ON "Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "GuestDietaryNote_eventId_idx" ON "GuestDietaryNote"("eventId");

-- CreateIndex
CREATE INDEX "Payment_eventId_idx" ON "Payment"("eventId");

-- CreateIndex
CREATE INDEX "EventExpense_eventId_kind_idx" ON "EventExpense"("eventId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "EventReview_eventId_key" ON "EventReview"("eventId");

-- CreateIndex
CREATE INDEX "CalendarEntry_date_idx" ON "CalendarEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "Recipe_name_idx" ON "Recipe"("name");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");

-- CreateIndex
CREATE INDEX "Dish_name_idx" ON "Dish"("name");

-- CreateIndex
CREATE INDEX "DishComponent_dishId_idx" ON "DishComponent"("dishId");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_eventId_key" ON "Menu"("eventId");

-- CreateIndex
CREATE INDEX "MenuCourse_menuId_idx" ON "MenuCourse"("menuId");

-- CreateIndex
CREATE INDEX "MenuItem_courseId_idx" ON "MenuItem"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingItemState_eventId_ingredientId_key" ON "ShoppingItemState"("eventId", "ingredientId");

-- CreateIndex
CREATE INDEX "ShoppingExtraItem_eventId_idx" ON "ShoppingExtraItem"("eventId");

-- CreateIndex
CREATE INDEX "PrepTask_eventId_phase_idx" ON "PrepTask"("eventId", "phase");

-- CreateIndex
CREATE INDEX "RunOfShowItem_eventId_idx" ON "RunOfShowItem"("eventId");

-- CreateIndex
CREATE INDEX "StaffAssignment_eventId_idx" ON "StaffAssignment"("eventId");

-- CreateIndex
CREATE INDEX "StaffAssignment_staffMemberId_idx" ON "StaffAssignment"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_name_key" ON "EquipmentItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EventEquipment_eventId_equipmentItemId_key" ON "EventEquipment"("eventId", "equipmentItemId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestDietaryNote" ADD CONSTRAINT "GuestDietaryNote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_preferredVendorId_fkey" FOREIGN KEY ("preferredVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishComponent" ADD CONSTRAINT "DishComponent_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishComponent" ADD CONSTRAINT "DishComponent_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCourse" ADD CONSTRAINT "MenuCourse_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "MenuCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItemState" ADD CONSTRAINT "ShoppingItemState_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItemState" ADD CONSTRAINT "ShoppingItemState_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItemState" ADD CONSTRAINT "ShoppingItemState_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingExtraItem" ADD CONSTRAINT "ShoppingExtraItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingExtraItem" ADD CONSTRAINT "ShoppingExtraItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepTask" ADD CONSTRAINT "PrepTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepTask" ADD CONSTRAINT "PrepTask_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepTask" ADD CONSTRAINT "PrepTask_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepTask" ADD CONSTRAINT "PrepTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunOfShowItem" ADD CONSTRAINT "RunOfShowItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEquipment" ADD CONSTRAINT "EventEquipment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEquipment" ADD CONSTRAINT "EventEquipment_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
