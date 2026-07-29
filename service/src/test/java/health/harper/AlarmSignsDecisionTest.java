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
            .body("{\"signsOfPhysicalAbuse\": true, \"signsOfDrugAbuse\": true, " +
                  "\"signsOfAnogenitalTrauma\": false, \"signsOfVenerealDisease\": false, " +
                  "\"evidenceOfAbuseInOutsideRecords\": false, \"suspiciousBehaviorInAccompanyingAdult\": false, " +
                  "\"suspiciousBehaviorOfPatient\": false}")
        .when().post("/AlarmSigns")
        .then().statusCode(200)
            .body("numberOfAlarmSigns", is(2))
            .body("suspiciousFindings", is(true));
    }

    @Test
    void oneSign_isNotSuspicious() {
        given().contentType(CT)
            .body("{\"signsOfPhysicalAbuse\": true, \"signsOfDrugAbuse\": false, " +
                  "\"signsOfAnogenitalTrauma\": false, \"signsOfVenerealDisease\": false, " +
                  "\"evidenceOfAbuseInOutsideRecords\": false, \"suspiciousBehaviorInAccompanyingAdult\": false, " +
                  "\"suspiciousBehaviorOfPatient\": false}")
        .when().post("/AlarmSigns")
        .then().statusCode(200)
            .body("numberOfAlarmSigns", is(1))
            .body("suspiciousFindings", is(false));
    }
}
