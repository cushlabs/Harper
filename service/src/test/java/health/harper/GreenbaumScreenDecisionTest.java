package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the Greenbaum screen DMN decision (endpoint POST /GreenbaumScreen).
 * Positive when >= 2 of the six items are positive (partner item counts when > 5).
 */
@QuarkusTest
class GreenbaumScreenDecisionTest {

    private static final String CT = "application/json";
    private static final String DECISION = "'Screening Tool of Greenbaum'";

    @Test
    void twoOrMorePositive_isAtRisk() {
        given().contentType(CT)
            .body("{\"History of significant trauma?\": true, \"History of running away from home?\": false, " +
                  "\"History of alcohol or drug abuse?\": true, \"Ever involved with law enforcement?\": false, " +
                  "\"History of sexually transmitted disease?\": false, \"Number of sexual partners\": 2}")
        .when().post("/GreenbaumScreen")
        .then().statusCode(200)
            .body(DECISION, is(true));
    }

    @Test
    void singlePositive_isNotAtRisk() {
        given().contentType(CT)
            .body("{\"History of significant trauma?\": true, \"History of running away from home?\": false, " +
                  "\"History of alcohol or drug abuse?\": false, \"Ever involved with law enforcement?\": false, " +
                  "\"History of sexually transmitted disease?\": false, \"Number of sexual partners\": 0}")
        .when().post("/GreenbaumScreen")
        .then().statusCode(200)
            .body(DECISION, is(false));
    }

    @Test
    void moreThanFivePartnersPlusOneItem_isAtRisk() {
        given().contentType(CT)
            .body("{\"History of significant trauma?\": true, \"History of running away from home?\": false, " +
                  "\"History of alcohol or drug abuse?\": false, \"Ever involved with law enforcement?\": false, " +
                  "\"History of sexually transmitted disease?\": false, \"Number of sexual partners\": 6}")
        .when().post("/GreenbaumScreen")
        .then().statusCode(200)
            .body(DECISION, is(true));
    }
}
