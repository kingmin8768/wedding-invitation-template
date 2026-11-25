import { INVITATION_CONFIG } from '../config/invitationConfig';

const Calendar = () => {
  const { wedding, venue } = INVITATION_CONFIG;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const firstDayOfWeek = new Date(wedding.year, wedding.month - 1, 1).getDay();
  const daysInMonth = new Date(wedding.year, wedding.month, 0).getDate();

  const weeks = [];
  let currentDay = 1;
  let weekIndex = 0;

  while (currentDay <= daysInMonth) {
    const cells = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if (weekIndex === 0 && dayIndex < firstDayOfWeek) {
        cells.push(null);
      } else if (currentDay <= daysInMonth) {
        cells.push(currentDay);
        currentDay += 1;
      } else {
        cells.push(null);
      }
    }

    weeks.push(cells);
    weekIndex += 1;
  }

  return (
    <div className="calendar" data-aos="fade-up">
      <div className="calendar-card">
        <div className="calendar-caption">
          <p className="calendar-caption__title">예식 안내</p>
          <p className="calendar-caption__date">{wedding.displayDate}</p>
          <p className="calendar-caption__place">{venue.name}</p>
          <p className="calendar-caption__hall">{venue.floor}</p>
        </div>

        <div className="calendar-top-line" />

        <table className="calendar-table">
          <caption>
            <p className="calendar-table__month">{wedding.monthLabel}</p>
          </caption>
          <thead>
            <tr>
              {dayNames.map((name, index) => (
                <th key={name} className={index === 0 ? 'sunday' : ''} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, rowIndex) => (
              <tr key={`week-${rowIndex}`}>
                {week.map((day, dayIndex) => {
                  const isSunday = dayIndex === 0;
                  const isWeddingDay = day === wedding.day;

                  return (
                    <td key={`day-${rowIndex}-${dayIndex}`} className={`${isSunday ? 'sunday' : ''} ${isWeddingDay ? 'active' : ''}`.trim()}>
                      {day || null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} />
            </tr>
          </tfoot>
        </table>

        <div className="calendar-bottom-line" />
      </div>
    </div>
  );
};

export default Calendar;
