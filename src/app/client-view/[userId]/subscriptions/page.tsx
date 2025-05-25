"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckIcon } from "@heroicons/react/24/solid"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { SubscriptionPlans } from "@/stores/SubscriptionPlans"
import { useAppsContext } from "@/context/AppContext"
import { Client } from "@/stores/Client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/context/components/ui/card"
import { Button } from "@/context/components/ui/button"
import Link from "next/link"
import { headers } from "next/headers"
import SelectSubscriptionPlans from "./components/selectSubsctiptionPlans"

export default function SubscriptionsPage() {
  return (
    <div className="bg-blue-100/30 from-gray-50 to-gray-100 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl sm:text-3xl font-bold text-gray-900 mb-2">
            最適なプランをお選びください
          </h1>
          <p className="text-lg text-gray-600">
            あなたのニーズに合わせたプランで、サービスの可能性を最大限に引き出しましょう
          </p>
        </header>
        <SelectSubscriptionPlans />
      </div>
    </div>
  );
}