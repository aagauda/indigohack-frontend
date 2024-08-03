"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"



import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import axios from 'axios';
import { baseUrl } from "../../../../../util/config";
import { cn } from "@/lib/utils";

const BookingAmountSchema = z.object({
  type: z.string().nonempty("Type is required"),
  amount: z.number().positive("Amount must be a positive number"),
});

// Define schema
const ProfileFormSchema = z.object({
  flight_id: z.string().nonempty("Flight ID is required"),
  seat_number: z.string().nonempty("Seat number is required"),
  to: z.string().nonempty("Destination is required"),
  from: z.string().nonempty("Origin is required"),
  travel_date: z.string().nonempty("Travel date is required"),
  booking_amount: z.array(BookingAmountSchema)
});

type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export default function ProfileForm() {
  const { data: session, status } = useSession();
  const token = session?.user?.tempToken;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [flightNumbers, setFlightNumbers] = useState<string[]>([]);
  const [seatNumbers, setSeatNumbers] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [travelDates, setTravelDates] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [bookingAmounts, setBookingAmounts] = useState<any[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false); // New state for search completion

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      flight_id: "",
      seat_number: "",
      to: "",
      from: "",
      travel_date: "",
      booking_amount: [],
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (status === "authenticated") {
      form.reset({
        flight_id: "",
        seat_number: "",
        to: "",
        from: "",
        travel_date: "",
        booking_amount: [],
      });
    }
  }, [status, session, form]);

  useEffect(() => {
    // Fetch flight data for dropdowns
    async function fetchDropdownData() {
      try {
        const response = await axios.get(`${baseUrl}/flights`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
        });
        const flights = response.data;


        const uniqueDestinations = flights.reduce((acc: string[], flight: any) => {
          if (!acc.includes(flight.to)) acc.push(flight.to);
          return acc;
        }, []);
        setDestinations(uniqueDestinations);

        const uniqueOrigins = flights.reduce((acc: string[], flight: any) => {
          if (!acc.includes(flight.from)) acc.push(flight.from);
          return acc;
        }, []);
        setOrigins(uniqueOrigins);

        const uniqueTravelDates = flights.reduce((acc: string[], flight: any) => {
          const date = new Date(flight.travel_date).toISOString().split('T')[0];
          if (!acc.includes(date)) acc.push(date);
          return acc;
        }, []);
        setTravelDates(uniqueTravelDates);

        const uniqueBookingAmounts = flights.reduce((acc: any[], flight: any) => {
          flight.booking_amount.forEach((ba: any) => {
            if (!acc.some(item => item.type === ba.type)) {
              acc.push(ba);
            }
          });
          return acc;
        }, []);
        setBookingAmounts(uniqueBookingAmounts);

      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    }

    fetchDropdownData();
  }, [token]);

  // Fetch flight data based on search criteria
  async function handleSearch() {
    const { from, to, travel_date } = form.getValues();
    try {
      const response = await axios.get(`${baseUrl}/flights/search`, {
        params: { from, to, travel_date },
        headers: {
          Authorization: `Bearer ${token}`
        },
      });
      const results = response.data;
      setSearchResults(results);
      setFlightNumbers(results.map((flight: any) => flight.flight_id));
      setSeatNumbers(['12A', '14B', '16C']); // This could be dynamic if you fetch seat numbers as well
      setBookingAmounts(results.flatMap((flight: any) => flight.booking_amount.map((ba: any) => ({ ...ba, flight_id: flight.flight_id }))));
      setSearchCompleted(true); // Set search completed to true
    } catch (error) {
      console.error('Error fetching flight data:', error);
      setSearchResults([]);
      toast({
        duration: 2000,
        title: "Search Failed",
        description: "No flights found for the given criteria.",
      });
      setSearchCompleted(false); // Reset search completion on error
    }
  }

  async function onSubmit(data: ProfileFormValues) {
    console.log(data);

    if (!session?.user?.tempToken) {
      toast({
        duration: 1000,
        title: "Authentication Error",
        description: "Unable to authenticate user.",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {


      const response = await axios.post(`${baseUrl}/bookings`, {
        flight_id: data.flight_id,
        seat_number: data.seat_number,
        to: data.to,
        from: data.from,
        travel_date: data.travel_date,
        booking_amount: data.booking_amount.map((amount) => ({
          type: amount.type,
          amount: amount.amount,
        })),
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      const result = response.data;
      console.log(result);

      if (response.status >= 200 && response.status < 300) {
        toast({
          duration: 2000,
          title: "Booking Successful",
          description: "Your flight is booked successfully.",
        });

        setTimeout(() => {
          router.replace("/dashboard");
        }, 2000);
      } else {
        toast({
          duration: 2000,
          title: "Unexpected Response",
          description: "The response from the server was not as expected.",
        });
      }
    } catch (error) {
      console.error('Error booking flight:', error);
      if (axios.isAxiosError(error) && error.response) {
        const { data } = error.response;
        setErrorMessage(data.message || "Booking failed.");
        toast({
          duration: 2000,
          title: "Booking Failed",
          description: "You have already booked the flight",
        });
      } else {
        toast({
          duration: 1000,
          title: "An error occurred",
          description: "Please try again later.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }



  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")


  const findDest=(field:any)=>{
    let dest=destinations.find(
      (destination) => {
        console.log("hello des",destination)
        return destination === field.value
      }
    );

    return dest;
  }


  return (
    <>
      {status === "loading" || isSubmitting ? (
        <p>Loading...</p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-row gap-4">

              {/* Dropdown for Destination */}

              {/* <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Select {...field} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinations.map((destination) => (
                            <SelectItem key={destination} value={destination}>
                              {destination}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Select your destination</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}








              {/* Dropdown for Destination */}

              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-[10px]">
                    <FormLabel>Destination</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-[200px] justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {
                            
                            destinations
                              ? destinations.find(
                                (destination) => {
                                  // console.log("hello des",destination)
                                  return destination === field.value
                                }
                              )
                              : "Select Destinations"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Search Destination..." />
                          <CommandList>
                            <CommandEmpty>No Data found.</CommandEmpty>
                            <CommandGroup>
                              {destinations.map((destination, index) => (
                                <CommandItem
                                  value={ `${index}1`}
                                  key={destination}
                                  onSelect={() => {
                                    form.setValue("to", destination)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",

                                    )}
                                  />
                                  {destination}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Search your destination
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />







              {/* Dropdown for Origin */}
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin</FormLabel>
                    <FormControl>
                      <Select {...field} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an origin" />
                        </SelectTrigger>
                        <SelectContent>
                          {origins.map((origin) => (
                            <SelectItem key={origin} value={origin}>
                              {origin}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Select your origin</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dropdown for Travel Date */}
              <FormField
                control={form.control}
                name="travel_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travel Date</FormLabel>
                    <FormControl>
                      <Select {...field} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a travel date" />
                        </SelectTrigger>
                        <SelectContent>
                          {travelDates.map((date) => (
                            <SelectItem key={date} value={date}>
                              {date}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Select your travel date</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Button to trigger search */}
              <Button type="button" onClick={handleSearch}>
                Search Flights
              </Button>
            </div>

            {/* Conditional rendering for flight_id dropdown */}
            {searchCompleted && (
              <>
                <FormField
                  control={form.control}
                  name="flight_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight ID</FormLabel>
                      <FormControl>
                        <Select {...field} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a flight" />
                          </SelectTrigger>
                          <SelectContent>
                            {flightNumbers.map((flightId) => (
                              <SelectItem key={flightId} value={flightId}>
                                {flightId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Select your flight ID</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dropdown for Seat Number */}
                <FormField
                  control={form.control}
                  name="seat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Number</FormLabel>
                      <FormControl>
                        <Select {...field} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a seat number" />
                          </SelectTrigger>
                          <SelectContent>
                            {seatNumbers.map((seatNumber) => (
                              <SelectItem key={seatNumber} value={seatNumber}>
                                {seatNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Select your seat number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dropdown for Booking Amount */}
                <FormField
                  control={form.control}
                  name="booking_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Amount</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value.map(amount => amount.type).join(',')} // Set the value to display selected items
                          onValueChange={(value) => {
                            const selectedAmount = bookingAmounts.find(
                              (amount) => amount.type === value
                            );
                            if (selectedAmount) {
                              form.setValue("booking_amount", [selectedAmount]); // Update the form state
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select booking amount" />
                          </SelectTrigger>
                          <SelectContent>
                            {bookingAmounts.map(({ type, amount }) => (
                              <SelectItem key={type} value={type}>
                                {`${type} - $${amount}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Select your booking amount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Submit button */}
                <Button type="submit">Submit</Button>
              </>
            )}
          </form>
        </Form>
      )}
    </>
  );
}
