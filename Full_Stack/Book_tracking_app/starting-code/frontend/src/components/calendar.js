import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

const CalendarComponent = ({events}) => {

  const localizer = momentLocalizer(moment);

  return (
    <div>
      <Calendar
        localizer={localizer}
        events={events.map(e => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end)
        }))}
        views={{ month: true, week: false, day: false, agenda: true }}
        style={{ height: 600 }}
      />
    </div>
  );
};

export default CalendarComponent;