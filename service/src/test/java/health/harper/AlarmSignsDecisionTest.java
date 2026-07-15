package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the Alarm Signs DMN model (endpoint POST /AlarmSigns).
 * Counts positive alarm signs and flags suspicious findings at the configured threshold (2).
 */
@QuarkusTest
class AlarmSignsDecisionTest {

    private static final String CT = "application/json";

    @Test
    void twoSigns_areSuspicious() {
        given().contentType(CT)
            .body("{\"Signs of physical abuse\": true, \"Signs of drug abuse\": true, " +
                  "\"Signs of anogenital trauma\": false, \"Signs of venereal disease\": false, " +
                  "\"Evidence of abuse in outside records\": false, \"Suspicious behavior in accompanying adult\": false, " +
                  "\"Suspicious behavior of patient\": false}")
        .when().post("/AlarmSigns")
        .then().statusCode(200)
            .body("'Number of alarm signs'", is(2))
            .body("'Suspicious findings for human trafficking?'", is(true));
    }

    @Test
    void oneSign_isNotSuspicious() {
        given().contentType(CT)
            .body("{\"Signs of physical abuse\": true, \"Signs of drug abuse\": false, " +
                  "\"Signs of anogenital trauma\": false, \"Signs of venereal disease\": false, " +
                  "\"Evidence of abuse in outside records\": false, \"Suspicious behavior in accompanying adult\": false, " +
                  "\"Suspicious behavior of patient\": false}")
        .when().post("/AlarmSigns")
        .then().statusCode(200)
            .body("'Number of alarm signs'", is(1))
            .body("'Suspicious findings for human trafficking?'", is(false));
    }
}
