
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL;

export const options = {
  vus: 1,
  iterations: 5,
};

export default function () {
  const response = http.get(
    `${BASE_URL}/api/quiz/questions`
  );

  console.log(
    `STATUS=${response.status} BODY=${response.body.substring(0, 700)}`
  );
}
