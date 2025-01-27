import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { Plus, Plane, Building2, List, Loader2, Filter, ChevronDown, ChevronUp, X, ClipboardList, CheckCircle } from 'lucide-react';
import { db } from './lib/db';
import type { Flight, Company, FlightTask } from './types';
import FlightModal from './components/FlightModal';
import CompanyModal from './components/CompanyModal';
import FlightTable from './components/FlightTable';
import CompanyTable from './components/CompanyTable';
import Auth from './components/Auth';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const getColorForCompany = (companyName: string) => {
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

type View = 'calendar' | 'flights' | 'companies';
type CalendarViewType = 'month' | 'week' | 'day';

interface User {
  email: string;
}

function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('calendar');
  const [session, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const [selectedTailFilter, setSelectedTailFilter] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarViewType>(Views.MONTH);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);
  const [tasks, setTasks] = useState<FlightTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Set min and max time for day/week views
  const minTime = new Date();
  minTime.setHours(6, 0, 0);
  const maxTime = new Date();
  maxTime.setHours(22, 0, 0);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: number | null = null;

    const initializeAuth = async (retryCount = 0) => {
      try {
        if (!mounted) return;

        setLoading(true);
        setAuthError(null);

        const { data, error } = await db.auth.getUser();
        
        if (error) throw error;

        if (!mounted) return;

        setSession(data.user as User);
        setLoading(false);
      } catch (error: any) {
        console.error('Auth error:', error);
        
        if (!mounted) return;

        if (retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          retryTimeout = window.setTimeout(() => {
            initializeAuth(retryCount + 1);
          }, delay);
        } else {
          setLoading(false);
          setSession(null);
          setAuthError('Unable to connect to authentication service. Please try again later.');
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setError(null);
    setLoading(true);

    try {
      // Fetch flights
      const { data: flightData, error: flightError } = await db.flights.getAll();
      if (flightError) {
        setError(flightError);
        return;
      }
      setFlights(flightData || []);

      // Fetch companies
      const { data: companyData, error: companyError } = await db.companies.getAll();
      if (companyError) {
        setError(companyError);
        return;
      }
      setCompanies(companyData || []);

      // Fetch all tasks for all flights
      const allTasks: FlightTask[] = [];
      for (const flight of flightData || []) {
        const { data: taskData } = await db.tasks.getByFlight(flight.id);
        if (taskData) {
          allTasks.push(...taskData);
        }
      }
      setTasks(allTasks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: Flight) => {
    setSelectedFlight(event);
    setIsFlightModalOpen(true);
  };

  const handleCloseFlightModal = () => {
    setSelectedFlight(null);
    setIsFlightModalOpen(false);
  };

  const handleCloseCompanyModal = () => {
    setSelectedCompany(null);
    setIsCompanyModalOpen(false);
  };

  const getFlightStatus = (flight: Flight) => {
    if (flight.status === 'cancelled') {
      return { icon: <X className="h-4 w-4 text-red-600" />, label: 'Cancelled' };
    }

    const flightTasks = tasks.filter(t => t.flight_id === flight.id);
    if (flightTasks.length === 0) return null;

    const allCompleted = flightTasks.every(t => t.completed);
    if (allCompleted) {
      return { icon: <CheckCircle className="h-4 w-4 text-green-600" />, label: 'All Tasks Complete' };
    }
    return { icon: <ClipboardList className="h-4 w-4 text-blue-600" />, label: 'Open Tasks' };
  };

  // Filter flights based on selected criteria
  const filteredFlights = flights.filter(flight => {
    let matches = true;

    if (selectedCompanyFilter) {
      matches = matches && flight.company === selectedCompanyFilter;
    }

    if (selectedTailFilter) {
      matches = matches && flight.tail_number === selectedTailFilter;
    }

    if (startDateFilter) {
      matches = matches && new Date(flight.start_date) >= new Date(startDateFilter);
    }

    if (endDateFilter) {
      matches = matches && new Date(flight.end_date) <= new Date(endDateFilter);
    }

    return matches;
  });

  const calendarEvents = filteredFlights.map(flight => ({
    ...flight,
    title: `${flight.company} - ${flight.tail_number}`,
    start: new Date(flight.start_date),
    end: new Date(flight.end_date),
    resource: flight,
  }));

  const getCalendarHeight = () => {
    const baseHeight = showFilters ? 280 : 200;
    const windowHeight = window.innerHeight;
    const minHeight = 400;
    
    const currentDate = calendarDate;
    let visibleEvents = [];
    
    if (calendarView === Views.MONTH) {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      visibleEvents = calendarEvents.filter(event => 
        new Date(event.start) <= endOfMonth && 
        new Date(event.end) >= startOfMonth
      );
    } else if (calendarView === Views.WEEK) {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      visibleEvents = calendarEvents.filter(event =>
        new Date(event.start) <= endOfWeek &&
        new Date(event.end) >= startOfWeek
      );
    } else {
      const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
      visibleEvents = calendarEvents.filter(event =>
        new Date(event.start) <= endOfDay &&
        new Date(event.end) >= startOfDay
      );
    }

    const eventsPerRow = calendarView === Views.MONTH ? 5 : 3;
    const maxEventsInView = Math.max(...Array.from({ length: 31 }, (_, day) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1);
      return visibleEvents.filter(event => 
        new Date(event.start) <= date && 
        new Date(event.end) >= date
      ).length;
    }));

    const rowsNeeded = Math.ceil(maxEventsInView / eventsPerRow);
    const additionalHeight = Math.max(0, rowsNeeded - 2) * 25;
    
    const calculatedHeight = windowHeight - baseHeight + additionalHeight;
    return Math.max(minHeight, calculatedHeight);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <div className="text-gray-600 text-lg">Loading Flight Tracker...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 mb-4">{authError}</div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
